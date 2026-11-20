import { NextResponse } from "next/server";
import { prisma, OrderStatus, RoleCode } from "@ev-cpo/db";
import { requireAuth, handleApiError } from "@/lib/auth";
import { sendOcppRemoteStop } from "@/lib/ocpp-client";

const ORDER_INCLUDE = {
  site: true,
  charger: true,
  connector: {
    include: {
      qrCodes: {
        where: { isActive: true },
        take: 1,
      },
    },
  },
  tariffSnapshot: true,
  payments: {
    include: {
      events: {
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
  events: {
    orderBy: { createdAt: "asc" as const },
  },
  ocppTransaction: true,
  meterValues: {
    orderBy: { sampledAt: "desc" as const },
    take: 25,
  },
};

export async function POST(
  req: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { orderId } = await context.params;

    const order = await prisma.chargingOrder.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      return NextResponse.json(
        {
          errorCode: "ORDER_NOT_FOUND",
          message: "Charging order not found.",
        },
        { status: 404 }
      );
    }

    const isOwner = order.userId === user.id;
    const isAdmin = user.roleCodes.includes(RoleCode.ADMIN);

    if (!isOwner && !isAdmin) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.roleCodes.join(","),
          action: "UNAUTHORIZED_ATTEMPT",
          targetType: "ORDER",
          targetId: order.id,
          reason: `Unauthorized attempt to stop charging order ${order.orderNo} belonging to another user.`,
          isSecurity: true,
        },
      });

      return NextResponse.json(
        {
          errorCode: "FORBIDDEN",
          message: "You do not have permission to stop this charging session.",
        },
        { status: 403 }
      );
    }

    // Idempotent handling if already completed or stopping
    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.START_FAILED
    ) {
      return NextResponse.json({
        ok: true,
        idempotentReplay: true,
        order,
      });
    }

    const previousStatus = order.status;

    if (order.status !== OrderStatus.STOPPING) {
      await prisma.$transaction([
        prisma.chargingOrder.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.STOPPING,
            remoteStopSentAt: new Date(),
          },
        }),
        prisma.chargingOrderEvent.create({
          data: {
            orderId: order.id,
            fromStatus: previousStatus,
            toStatus: OrderStatus.STOPPING,
            eventType: "REMOTE_STOP_SENT",
            actor: isAdmin && !isOwner ? "ADMIN" : "USER",
            description: `User requested stop. Sending OCPP 1.6J RemoteStopTransaction to ${order.charger.ocppId}.`,
          },
        }),
      ]);
    }

    const remoteStopResult = await sendOcppRemoteStop({
      ocppId: order.charger.ocppId,
      transactionId: order.ocppTransaction?.transactionId ?? null,
      orderId: order.id,
    });

    const updatedOrder = await prisma.chargingOrder.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });

    return NextResponse.json({
      ok: true,
      order: updatedOrder || order,
      remoteStopResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
