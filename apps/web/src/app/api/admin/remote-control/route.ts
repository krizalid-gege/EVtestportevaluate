import { NextResponse } from "next/server";
import {
  prisma,
  RoleCode,
  OrderStatus,
  generateOrderOcppIdTag,
} from "@ev-cpo/db";
import {
  requireAuth,
  requireRole,
  jsonError,
  handleApiError,
} from "@/lib/auth";
import {
  sendOcppRemoteStart,
  sendOcppRemoteStop,
  sendOcppReset,
} from "@/lib/ocpp-client";

/**
 * REQ-ADM-002 & REQ-ADM-003:
 * High-risk Remote Control API (RemoteStart / RemoteStop / Soft & Hard Reset / Toggle Preparing State).
 * - Strictly restricted to ADMIN (rejects CUSTOMER_SERVICE and SITE_STAFF with 403 + security AuditLog!).
 * - Requires secondary confirmation (`confirmed === true`) and non-empty `reason` (>= 3 chars).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const chargerId = String(body.chargerId || body.ocppId || "").trim();
    const command = String(body.command || body.action || "")
      .trim()
      .toUpperCase();
    const confirmed = Boolean(body.confirmed);
    const reason = String(body.reason || "").trim();

    // 1. RBAC Guard: Rejects CUSTOMER_SERVICE / SITE_STAFF and writes UNAUTHORIZED_ATTEMPT AuditLog
    await requireRole(
      user,
      [RoleCode.ADMIN],
      `REMOTE_CONTROL_${command || "UNKNOWN"}`,
      "CHARGER",
      chargerId || "unknown-charger"
    );

    // 2. Secondary confirmation & reason check (REQ-ADM-003)
    if (!confirmed) {
      return jsonError(
        400,
        "CONFIRMATION_REQUIRED",
        "High-risk remote charger action requires secondary confirmation (confirmed: true)."
      );
    }

    if (reason.length < 3) {
      return jsonError(
        400,
        "REASON_REQUIRED",
        "High-risk remote charger action requires an audit reason (at least 3 characters)."
      );
    }

    const charger = await prisma.charger.findFirst({
      where: {
        OR: [{ id: chargerId }, { ocppId: chargerId }],
      },
      include: {
        connectors: {
          where: { connectorId: 1 },
        },
      },
    });

    if (!charger) {
      return jsonError(404, "CHARGER_NOT_FOUND", "Charger not found.");
    }

    let gatewayResult: any = null;
    let auditAction = "CHARGER_REMOTE_CONTROL";

    if (command === "TOGGLE_PREPARING_STATE") {
      auditAction = "CHARGER_CONFIG_UPDATE";
      const nextVal =
        body.requirePreparingState !== undefined
          ? Boolean(body.requirePreparingState)
          : !charger.requirePreparingState;

      const updatedCharger = await prisma.charger.update({
        where: { id: charger.id },
        data: { requirePreparingState: nextVal },
      });

      const auditLog = await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.roleCodes.join(","),
          action: auditAction,
          targetType: "CHARGER",
          targetId: charger.id,
          reason,
          beforeState: {
            ocppId: charger.ocppId,
            requirePreparingState: charger.requirePreparingState,
          },
          afterState: {
            ocppId: charger.ocppId,
            requirePreparingState: updatedCharger.requirePreparingState,
          },
          isSecurity: false,
        },
      });

      return NextResponse.json({
        ok: true,
        command,
        chargerOcppId: charger.ocppId,
        requirePreparingState: updatedCharger.requirePreparingState,
        auditLog,
      });
    } else if (command === "REMOTE_START") {
      auditAction = "CHARGER_REMOTE_START";
      const idTag = body.idTag ? String(body.idTag) : generateOrderOcppIdTag();
      gatewayResult = await sendOcppRemoteStart({
        ocppId: charger.ocppId,
        connectorId: 1,
        idTag,
        orderId: body.orderId ? String(body.orderId) : undefined,
      });
    } else if (command === "REMOTE_STOP") {
      auditAction = "CHARGER_REMOTE_STOP";
      const activeOrder = await prisma.chargingOrder.findFirst({
        where: {
          chargerId: charger.id,
          status: {
            in: [OrderStatus.STARTING, OrderStatus.CHARGING, OrderStatus.STOPPING],
          },
        },
        include: { ocppTransaction: true },
        orderBy: { createdAt: "desc" },
      });

      gatewayResult = await sendOcppRemoteStop({
        ocppId: charger.ocppId,
        transactionId:
          body.transactionId !== undefined
            ? Number(body.transactionId)
            : activeOrder?.ocppTransaction?.transactionId ?? null,
        orderId: activeOrder?.id,
      });
    } else if (
      command === "RESET_SOFT" ||
      command === "SOFT_RESET" ||
      command === "RESET_HARD" ||
      command === "HARD_RESET"
    ) {
      auditAction = "CHARGER_RESET";
      const resetType =
        command === "RESET_HARD" || command === "HARD_RESET" ? "Hard" : "Soft";
      gatewayResult = await sendOcppReset({
        ocppId: charger.ocppId,
        type: resetType,
      });
    } else {
      return jsonError(
        400,
        "INVALID_COMMAND",
        `Unsupported remote command "${command}". Expected REMOTE_START, REMOTE_STOP, RESET_SOFT, or RESET_HARD.`
      );
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.roleCodes.join(","),
        action: auditAction,
        targetType: "CHARGER",
        targetId: charger.id,
        reason,
        beforeState: {
          ocppId: charger.ocppId,
          connectionStatus: charger.connectionStatus,
          connectorStatus: charger.connectors[0]?.ocppStatus ?? null,
        },
        afterState: {
          command,
          confirmed,
          gatewayResult,
        },
        isSecurity: false,
      },
    });

    return NextResponse.json({
      ok: true,
      command,
      chargerOcppId: charger.ocppId,
      gatewayResult,
      auditLog,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
