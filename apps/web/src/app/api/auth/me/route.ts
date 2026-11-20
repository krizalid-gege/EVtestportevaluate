import { NextResponse } from "next/server";
import { prisma, OrderStatus } from "@ev-cpo/db";
import { getCurrentUser, handleApiError } from "@/lib/auth";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.AUTHORIZING,
  OrderStatus.READY_TO_START,
  OrderStatus.STARTING,
  OrderStatus.CHARGING,
  OrderStatus.STOPPING,
];

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        user: null,
        activeOrder: null,
      });
    }

    const activeOrder = await prisma.chargingOrder.findFirst({
      where: {
        userId: user.id,
        status: { in: ACTIVE_ORDER_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      include: {
        site: {
          select: { id: true, code: true, name: true, address: true },
        },
        charger: {
          select: {
            id: true,
            ocppId: true,
            name: true,
            model: true,
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
      },
    });

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user,
      activeOrder: activeOrder
        ? {
            ...activeOrder,
            qrToken: activeOrder.connector?.qrCodes?.[0]?.qrToken || null,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
