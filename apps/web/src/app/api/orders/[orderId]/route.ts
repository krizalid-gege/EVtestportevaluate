import { NextResponse } from "next/server";
import { prisma, RoleCode } from "@ev-cpo/db";
import {
  requireAuth,
  hasSiteAccess,
  maskEmailForCs,
  maskPhoneForCs,
  handleApiError,
} from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { orderId } = await context.params;

    const order = await prisma.chargingOrder.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNo: orderId }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            phone: true,
          },
        },
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
          orderBy: { createdAt: "desc" },
          include: {
            events: {
              orderBy: { createdAt: "asc" },
            },
            refunds: true,
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
        ocppTransaction: true,
        meterValues: {
          orderBy: { sampledAt: "desc" },
          take: 40,
        },
      },
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
    const isStaffWithAccess = hasSiteAccess(user, order.siteId);

    // Object-level authorization check (Section 13.1 & REQ-ADM-001)
    if (!isOwner && !isStaffWithAccess) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.roleCodes.join(","),
          action: "UNAUTHORIZED_ATTEMPT",
          targetType: "ORDER",
          targetId: order.id,
          reason: `Unauthorized object-level access attempt to order ${order.orderNo} (siteId=${order.siteId}).`,
          isSecurity: true,
        },
      });

      return NextResponse.json(
        {
          errorCode: "FORBIDDEN",
          message: "You do not have permission to view this order.",
        },
        { status: 403 }
      );
    }

    const sanitizedOrder = {
      ...order,
      user: order.user
        ? {
            ...order.user,
            email: isOwner
              ? order.user.email
              : maskEmailForCs(order.user.email, user.roleCodes),
            phone: isOwner
              ? order.user.phone
              : maskPhoneForCs(order.user.phone, user.roleCodes),
          }
        : null,
    };

    return NextResponse.json({
      ok: true,
      order: sanitizedOrder,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
