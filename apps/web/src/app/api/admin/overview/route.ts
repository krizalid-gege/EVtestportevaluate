import { NextResponse } from "next/server";
import {
  prisma,
  RoleCode,
  OrderStatus,
  ChargerConnectionStatus,
  AlertStatus,
} from "@ev-cpo/db";
import {
  requireAuth,
  requireRole,
  getSiteFilter,
  maskEmailForCs,
  maskPhoneForCs,
  handleApiError,
} from "@/lib/auth";
import { getOcppGatewayStatus } from "@/lib/ocpp-client";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.AUTHORIZING,
  OrderStatus.READY_TO_START,
  OrderStatus.STARTING,
  OrderStatus.CHARGING,
  OrderStatus.STOPPING,
];

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    await requireRole(
      user,
      [RoleCode.ADMIN, RoleCode.CUSTOMER_SERVICE, RoleCode.SITE_STAFF],
      "VIEW_ADMIN_OVERVIEW",
      "SITE",
      "overview"
    );

    const siteFilter = getSiteFilter(user);
    const isAdmin = user.roleCodes.includes(RoleCode.ADMIN);
    const isSiteStaff =
      user.roleCodes.includes(RoleCode.SITE_STAFF) &&
      !isAdmin &&
      !user.roleCodes.includes(RoleCode.CUSTOMER_SERVICE);

    const siteWhere = isSiteStaff
      ? { id: { in: user.assignedSiteIds } }
      : {};

    const [sites, chargers, tariffs, orders, auditLogs, emailDeliveries, gatewayStatus] =
      await Promise.all([
        prisma.site.findMany({
          where: siteWhere,
          orderBy: { code: "asc" },
        }),
        prisma.charger.findMany({
          where: siteFilter,
          orderBy: { ocppId: "asc" },
          include: {
            site: {
              select: { id: true, code: true, name: true, address: true },
            },
            connectors: {
              orderBy: { connectorId: "asc" },
              include: {
                qrCodes: {
                  where: { isActive: true },
                },
              },
            },
          },
        }),
        prisma.tariff.findMany({
          where: isSiteStaff
            ? { OR: [{ siteId: { in: user.assignedSiteIds } }, { siteId: null }] }
            : {},
          orderBy: { updatedAt: "desc" },
        }),
        prisma.chargingOrder.findMany({
          where: siteFilter,
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                phone: true,
                status: true,
              },
            },
            site: {
              select: { id: true, code: true, name: true },
            },
            charger: {
              select: {
                id: true,
                ocppId: true,
                name: true,
                model: true,
                seccModel: true,
                ratedPowerKw: true,
                seccStageInfo: true,
              },
            },
            connector: {
              select: {
                id: true,
                connectorId: true,
                standard: true,
                ocppStatus: true,
                gunTemp1C: true,
              },
            },
            tariffSnapshot: true,
            payments: {
              orderBy: { createdAt: "desc" },
              include: {
                events: {
                  orderBy: { createdAt: "asc" },
                },
              },
            },
            ocppTransaction: true,
            events: {
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        isAdmin
          ? prisma.auditLog.findMany({
              orderBy: { createdAt: "desc" },
              take: 60,
            })
          : Promise.resolve([]),
        Promise.resolve([] as Array<{ id: string; toEmail: string; [key: string]: any }>),
        getOcppGatewayStatus(),
      ]);

    const visibleChargerIds = chargers.map((c) => c.id);
    const visibleOrderIds = orders.map((o) => o.id);

    const [ocppMessages, payments, alerts, scopedEmailDeliveries] = await Promise.all([
      prisma.ocppMessage.findMany({
        where: isSiteStaff ? { chargerId: { in: visibleChargerIds } } : {},
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      prisma.payment.findMany({
        where: isSiteStaff ? { orderId: { in: visibleOrderIds } } : {},
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              status: true,
              chargedEnergyWh: true,
              totalAmountSen: true,
            },
          },
          events: {
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.alert.findMany({
        where: isSiteStaff
          ? {
              OR: [
                { chargerId: { in: visibleChargerIds } },
                { orderId: { in: visibleOrderIds } },
              ],
            }
          : {},
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          charger: {
            select: { id: true, ocppId: true, name: true, siteId: true },
          },
        },
      }),
      prisma.emailDelivery.findMany({
        where: isSiteStaff ? { orderId: { in: visibleOrderIds } } : {},
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    void emailDeliveries;

    // Sanitize chargers (never return authTokenHash)
    const sanitizedChargers = chargers.map(({ authTokenHash, ...rest }) => rest);

    // Mask customer PII for CUSTOMER_SERVICE & SITE_STAFF (Section 5 & Section 13.1)
    const sanitizedOrders = orders.map((ord) => ({
      ...ord,
      user: ord.user
        ? {
            ...ord.user,
            email: maskEmailForCs(ord.user.email, user.roleCodes),
            phone: maskPhoneForCs(ord.user.phone, user.roleCodes),
          }
        : null,
    }));

    const sanitizedEmails = scopedEmailDeliveries.map((mail) => ({
      ...mail,
      toEmail: maskEmailForCs(mail.toEmail, user.roleCodes),
    }));

    // Compute summary metrics
    const onlineChargers = sanitizedChargers.filter(
      (c) => c.connectionStatus === ChargerConnectionStatus.ONLINE
    ).length;
    const activeOrdersCount = sanitizedOrders.filter((o) =>
      ACTIVE_ORDER_STATUSES.includes(o.status)
    ).length;
    const completedOrders = sanitizedOrders.filter(
      (o) => o.status === OrderStatus.COMPLETED
    );
    const totalEnergyWh = completedOrders.reduce(
      (acc, o) => acc + (o.chargedEnergyWh || 0),
      0
    );
    const totalSimulatedRevenueSen = completedOrders.reduce(
      (acc, o) => acc + (o.totalAmountSen || 0),
      0
    );
    const openAlertsCount = alerts.filter(
      (a) => a.status === AlertStatus.OPEN
    ).length;
    const securityAuditCount = auditLogs.filter((a) => a.isSecurity).length;

    return NextResponse.json({
      ok: true,
      viewer: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roleCodes: user.roleCodes,
        siteAssignments: user.siteAssignments,
        isSiteScoped: isSiteStaff,
      },
      summary: {
        totalSites: sites.length,
        totalChargers: sanitizedChargers.length,
        onlineChargers,
        activeOrders: activeOrdersCount,
        completedOrders: completedOrders.length,
        totalEnergyWh,
        totalSimulatedRevenueSen,
        openAlerts: openAlertsCount,
        securityAuditCount,
      },
      sites,
      chargers: sanitizedChargers,
      tariffs,
      activeTariff: tariffs.find((t) => t.isActive) || tariffs[0] || null,
      orders: sanitizedOrders,
      ocppMessages,
      payments,
      alerts,
      auditLogs,
      emailDeliveries: sanitizedEmails,
      gatewayStatus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
