import { NextResponse } from "next/server";
import {
  prisma,
  RoleCode,
  AlertSeverity,
  AlertStatus,
} from "@ev-cpo/db";
import {
  requireAuth,
  requireRole,
  hasSiteAccess,
  handleApiError,
} from "@/lib/auth";

/**
 * Section 5:
 * Allows ADMIN, CUSTOMER_SERVICE, and SITE_STAFF to log customer issues / anomalies
 * or acknowledge/resolve alerts within their authorized site scope.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    await requireRole(
      user,
      [RoleCode.ADMIN, RoleCode.CUSTOMER_SERVICE, RoleCode.SITE_STAFF],
      "LOG_OR_UPDATE_ISSUE",
      "ORDER",
      String(body.orderId || body.chargerId || body.alertId || "issue")
    );

    // Action 1: Resolve or Acknowledge an existing Alert
    if (body.alertId && (body.action === "RESOLVE" || body.action === "ACKNOWLEDGE")) {
      const existingAlert = await prisma.alert.findUnique({
        where: { id: String(body.alertId) },
        include: { charger: true },
      });

      if (!existingAlert) {
        return NextResponse.json(
          { errorCode: "ALERT_NOT_FOUND", message: "Alert not found." },
          { status: 404 }
        );
      }

      if (existingAlert.charger && !hasSiteAccess(user, existingAlert.charger.siteId)) {
        return NextResponse.json(
          { errorCode: "FORBIDDEN", message: "No access to this site's alerts." },
          { status: 403 }
        );
      }

      const nextStatus =
        body.action === "RESOLVE" ? AlertStatus.RESOLVED : AlertStatus.ACKNOWLEDGED;

      const updatedAlert = await prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          status: nextStatus,
          resolvedAt: nextStatus === AlertStatus.RESOLVED ? new Date() : undefined,
          resolvedBy: user.email,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.roleCodes.join(","),
          action: `ALERT_${body.action}`,
          targetType: "CHARGER",
          targetId: existingAlert.chargerId || existingAlert.id,
          reason: String(body.reason || `${body.action} by ${user.email}`),
          afterState: { alertId: updatedAlert.id, status: updatedAlert.status },
          isSecurity: false,
        },
      });

      return NextResponse.json({
        ok: true,
        alert: updatedAlert,
      });
    }

    // Action 2: Create a new Customer / Site Issue Alert + AuditLog
    const title = String(body.title || "").trim();
    const description = String(body.description || body.reason || "").trim();
    const chargerId = body.chargerId ? String(body.chargerId).trim() : null;
    const orderId = body.orderId ? String(body.orderId).trim() : null;
    const alertType = String(body.alertType || "ORDER_ANOMALY").trim();
    const severityInput = String(body.severity || "WARNING").toUpperCase();
    const severity: AlertSeverity =
      severityInput === "CRITICAL"
        ? AlertSeverity.CRITICAL
        : severityInput === "INFO"
        ? AlertSeverity.INFO
        : AlertSeverity.WARNING;

    if (!title || !description) {
      return NextResponse.json(
        {
          errorCode: "INVALID_ISSUE_INPUT",
          message: "Both title and description are required to log an issue.",
        },
        { status: 400 }
      );
    }

    if (chargerId) {
      const charger = await prisma.charger.findUnique({ where: { id: chargerId } });
      if (charger && !hasSiteAccess(user, charger.siteId)) {
        return NextResponse.json(
          { errorCode: "FORBIDDEN", message: "You do not have access to this charger's site." },
          { status: 403 }
        );
      }
    }

    const alert = await prisma.alert.create({
      data: {
        chargerId,
        orderId,
        alertType,
        severity,
        status: AlertStatus.OPEN,
        title,
        description,
      },
    });

    const auditLog = await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.roleCodes.join(","),
        action: "CUSTOMER_ISSUE_LOGGED",
        targetType: orderId ? "ORDER" : chargerId ? "CHARGER" : "SITE",
        targetId: orderId || chargerId || alert.id,
        reason: description,
        afterState: {
          alertId: alert.id,
          title: alert.title,
          severity: alert.severity,
        },
        isSecurity: false,
      },
    });

    return NextResponse.json({
      ok: true,
      alert,
      auditLog,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
