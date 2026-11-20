import { NextResponse } from "next/server";
import { prisma, RoleCode } from "@ev-cpo/db";
import {
  requireAuth,
  getSiteFilter,
  maskEmailForCs,
  maskPhoneForCs,
  handleApiError,
} from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope"); // "mine" (default for driver) or "admin"

    const isStaff =
      user.roleCodes.includes(RoleCode.ADMIN) ||
      user.roleCodes.includes(RoleCode.CUSTOMER_SERVICE) ||
      user.roleCodes.includes(RoleCode.SITE_STAFF);

    const whereClause =
      scope === "admin" && isStaff
        ? getSiteFilter(user)
        : { userId: user.id };

    const orders = await prisma.chargingOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            phone: true,
          },
        },
        site: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
          },
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
            qrCodes: {
              where: { isActive: true },
              select: { qrToken: true },
              take: 1,
            },
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
    });

    const formattedOrders = orders.map((ord) => ({
      ...ord,
      user: ord.user
        ? {
            ...ord.user,
            email:
              ord.userId === user.id
                ? ord.user.email
                : maskEmailForCs(ord.user.email, user.roleCodes),
            phone:
              ord.userId === user.id
                ? ord.user.phone
                : maskPhoneForCs(ord.user.phone, user.roleCodes),
          }
        : null,
    }));

    return NextResponse.json({
      ok: true,
      orders: formattedOrders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
