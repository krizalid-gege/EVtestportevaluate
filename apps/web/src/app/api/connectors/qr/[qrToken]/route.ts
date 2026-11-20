import { NextResponse } from "next/server";
import { prisma, OrderStatus, RoleCode } from "@ev-cpo/db";
import { getCurrentUser, handleApiError } from "@/lib/auth";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.AUTHORIZING,
  OrderStatus.READY_TO_START,
  OrderStatus.STARTING,
  OrderStatus.CHARGING,
  OrderStatus.STOPPING,
];

export async function GET(
  req: Request,
  context: { params: Promise<{ qrToken: string }> }
) {
  try {
    const { qrToken } = await context.params;
    const token = decodeURIComponent(qrToken || "").trim();

    if (!token) {
      return NextResponse.json(
        {
          errorCode: "INVALID_QR_TOKEN",
          message: "Missing QR token.",
        },
        { status: 400 }
      );
    }

    // 1. Primary lookup by opaque ConnectorQrCode.qrToken (REQ-DEV-004)
    let qrRecord = await prisma.connectorQrCode.findUnique({
      where: { qrToken: token },
      include: {
        connector: {
          include: {
            charger: {
              include: {
                site: true,
              },
            },
          },
        },
      },
    });

    let connector = qrRecord?.connector || null;

    // 2. Fallback lookup by charger.ocppId or connector.id for convenient testing
    if (!connector) {
      const chargerByOcppId = await prisma.charger.findFirst({
        where: {
          OR: [{ ocppId: token }, { id: token }],
        },
        include: {
          site: true,
          connectors: {
            where: { connectorId: 1 },
            include: {
              qrCodes: {
                where: { isActive: true },
                take: 1,
              },
            },
          },
        },
      });

      if (chargerByOcppId && chargerByOcppId.connectors[0]) {
        const firstConn = chargerByOcppId.connectors[0];
        connector = {
          ...firstConn,
          charger: chargerByOcppId,
        };
      } else {
        const directConnector = await prisma.connector.findUnique({
          where: { id: token },
          include: {
            charger: {
              include: { site: true },
            },
          },
        });
        if (directConnector) {
          connector = directConnector;
        }
      }
    }

    if (!connector || !connector.charger) {
      return NextResponse.json(
        {
          errorCode: "QR_NOT_FOUND",
          message: `No charging connector found for QR token "${token}".`,
        },
        { status: 404 }
      );
    }

    const { charger } = connector;
    const { site } = charger;

    // 3. Resolve active tariff for this site (or default active tariff)
    let tariff = await prisma.tariff.findFirst({
      where: {
        siteId: site.id,
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!tariff) {
      tariff = await prisma.tariff.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
      });
    }

    // 4. Check for any active charging order on this connector (REQ-CHG-006)
    const currentUser = await getCurrentUser(req);
    const activeConnectorOrder = await prisma.chargingOrder.findFirst({
      where: {
        connectorId: connector.id,
        status: { in: ACTIVE_ORDER_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      include: {
        tariffSnapshot: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
        ocppTransaction: true,
        meterValues: {
          orderBy: { sampledAt: "desc" },
          take: 15,
        },
      },
    });

    const hasActiveOrder = Boolean(activeConnectorOrder);
    const isOwnedByCurrentUser = Boolean(
      activeConnectorOrder &&
        currentUser &&
        (activeConnectorOrder.userId === currentUser.id ||
          currentUser.roleCodes.includes(RoleCode.ADMIN))
    );
    const isOccupiedByOther = Boolean(hasActiveOrder && !isOwnedByCurrentUser);

    return NextResponse.json({
      ok: true,
      qrToken: qrRecord?.qrToken || token,
      site: {
        id: site.id,
        code: site.code,
        name: site.name,
        nameEn: site.nameEn,
        nameMs: site.nameMs,
        countryCode: site.countryCode,
        timezone: site.timezone,
        currency: site.currency,
        address: site.address,
      },
      charger: {
        id: charger.id,
        ocppId: charger.ocppId,
        name: charger.name,
        vendor: charger.vendor,
        model: charger.model,
        seccModel: charger.seccModel,
        firmwareVersion: charger.firmwareVersion,
        ratedPowerKw: charger.ratedPowerKw,
        staticPowerLimitKw: charger.staticPowerLimitKw,
        connectionStatus: charger.connectionStatus,
        requirePreparingState: charger.requirePreparingState,
        controllerOcppStatus: charger.controllerOcppStatus,
        controllerErrorCode: charger.controllerErrorCode,
        vendorErrorCode: charger.vendorErrorCode,
        seccStageInfo: charger.seccStageInfo,
        lastHeartbeatAt: charger.lastHeartbeatAt,
      },
      connector: {
        id: connector.id,
        connectorId: connector.connectorId,
        standard: connector.standard,
        ratedPowerKw: connector.ratedPowerKw,
        ocppStatus: connector.ocppStatus,
        isPluggedIn:
          connector.isPluggedIn ||
          connector.ocppStatus === "Preparing" ||
          connector.ocppStatus === "Charging" ||
          connector.ocppStatus === "Finishing",
        gunTemp1C: connector.gunTemp1C,
        gunTemp2C: connector.gunTemp2C,
        errorCode: connector.errorCode,
        vendorErrorCode: connector.vendorErrorCode,
        errorInfo: connector.errorInfo,
        lastStatusAt: connector.lastStatusAt,
      },
      tariff: tariff
        ? {
            id: tariff.id,
            name: tariff.name,
            currency: tariff.currency,
            energyPriceSenPerKwh: tariff.energyPriceSenPerKwh,
            serviceFeeSenPerKwh: tariff.serviceFeeSenPerKwh,
            totalPriceSenPerKwh:
              tariff.energyPriceSenPerKwh + tariff.serviceFeeSenPerKwh,
            taxRateBps: tariff.taxRateBps,
            isTaxInclusive: tariff.isTaxInclusive,
            isDemoPrice: tariff.isDemoPrice,
          }
        : {
            id: "default-tariff",
            name: "Standard 20kW DC Fast Tariff (Simulated MYR)",
            currency: "MYR",
            energyPriceSenPerKwh: 120,
            serviceFeeSenPerKwh: 30,
            totalPriceSenPerKwh: 150,
            taxRateBps: 600,
            isTaxInclusive: true,
            isDemoPrice: true,
          },
      hasActiveOrder,
      isOwnedByCurrentUser,
      isOccupiedByOther,
      // Section 13.4 privacy boundary: Only return order details if owned by current user
      activeOrder: isOwnedByCurrentUser ? activeConnectorOrder : null,
      activeOrderSummary: hasActiveOrder
        ? {
            status: activeConnectorOrder!.status,
            isOwnedByCurrentUser,
            orderId: isOwnedByCurrentUser ? activeConnectorOrder!.id : undefined,
            orderNo: isOwnedByCurrentUser
              ? activeConnectorOrder!.orderNo
              : undefined,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
