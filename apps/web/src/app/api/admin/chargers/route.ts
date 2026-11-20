import { NextResponse } from "next/server";
import {
  prisma,
  RoleCode,
  ConnectorStandard,
  generateOpaqueQrToken,
} from "@ev-cpo/db";
import {
  requireAuth,
  requireRole,
  handleApiError,
} from "@/lib/auth";

/**
 * REQ-DEV-003, REQ-DEV-004, REQ-DEV-006:
 * Only ADMIN can register or modify charger parameters.
 * Phase 1A strictly enforces 20kW Single-Gun DC model (ratedPowerKw: 20, connectorId: 1).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const targetId = String(body.chargerId || body.ocppId || "new-charger");

    await requireRole(
      user,
      [RoleCode.ADMIN],
      "CHARGER_CONFIG_UPDATE",
      "CHARGER",
      targetId
    );

    const reason = String(body.reason || "Admin charger configuration").trim();
    if (reason.length < 3) {
      return NextResponse.json(
        {
          errorCode: "REASON_REQUIRED",
          message: "An audit reason (at least 3 characters) is required.",
        },
        { status: 400 }
      );
    }

    // Mode 1: Update existing charger parameters
    if (body.chargerId) {
      const existing = await prisma.charger.findUnique({
        where: { id: String(body.chargerId) },
        include: {
          connectors: {
            include: { qrCodes: true },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          {
            errorCode: "CHARGER_NOT_FOUND",
            message: "Charger not found.",
          },
          { status: 404 }
        );
      }

      const staticPowerLimitKw =
        body.staticPowerLimitKw !== undefined
          ? Math.max(1, Math.min(20, Math.round(Number(body.staticPowerLimitKw) || 20)))
          : existing.staticPowerLimitKw;

      const requirePreparingState =
        body.requirePreparingState !== undefined
          ? Boolean(body.requirePreparingState)
          : existing.requirePreparingState;

      const isActive =
        body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;

      const beforeState = {
        name: existing.name,
        staticPowerLimitKw: existing.staticPowerLimitKw,
        requirePreparingState: existing.requirePreparingState,
        isActive: existing.isActive,
      };

      const updated = await prisma.charger.update({
        where: { id: existing.id },
        data: {
          name: body.name ? String(body.name).trim() : existing.name,
          staticPowerLimitKw,
          requirePreparingState,
          isActive,
        },
        include: {
          site: true,
          connectors: {
            include: { qrCodes: { where: { isActive: true } } },
          },
        },
      });

      const afterState = {
        name: updated.name,
        staticPowerLimitKw: updated.staticPowerLimitKw,
        requirePreparingState: updated.requirePreparingState,
        isActive: updated.isActive,
      };

      const auditLog = await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.roleCodes.join(","),
          action: "CHARGER_CONFIG_UPDATE",
          targetType: "CHARGER",
          targetId: updated.id,
          reason,
          beforeState,
          afterState,
          isSecurity: false,
        },
      });

      const { authTokenHash, ...safeCharger } = updated;

      return NextResponse.json({
        ok: true,
        charger: safeCharger,
        auditLog,
      });
    }

    // Mode 2: Create a new 20kW Single-Gun DC Charger (REQ-DEV-003 & REQ-DEV-004)
    const ocppId = String(body.ocppId || "").trim().toUpperCase();
    const name = String(body.name || ocppId).trim();
    const standard: ConnectorStandard =
      body.standard === "CCS2" ? ConnectorStandard.CCS2 : ConnectorStandard.GBT_DC;

    if (!ocppId) {
      return NextResponse.json(
        {
          errorCode: "INVALID_OCPP_ID",
          message: "ocppId is required to register a charger.",
        },
        { status: 400 }
      );
    }

    const dup = await prisma.charger.findUnique({ where: { ocppId } });
    if (dup) {
      return NextResponse.json(
        {
          errorCode: "DUPLICATE_OCPP_ID",
          message: `Charger with ocppId "${ocppId}" already exists (REQ-DEV-002).`,
        },
        { status: 409 }
      );
    }

    let siteId = body.siteId ? String(body.siteId) : null;
    if (!siteId) {
      const defaultSite = await prisma.site.findFirst({ orderBy: { code: "asc" } });
      siteId = defaultSite?.id || null;
    }

    if (!siteId) {
      return NextResponse.json(
        {
          errorCode: "SITE_NOT_FOUND",
          message: "No site available to attach the charger.",
        },
        { status: 400 }
      );
    }

    const qrToken = generateOpaqueQrToken(12);

    const created = await prisma.charger.create({
      data: {
        siteId,
        ocppId,
        name,
        vendor: "Techone",
        model: "GPEV20-BG102-S1P-EA", // Enforced 20kW Single-Gun DC model (REQ-DEV-003)
        seccModel: "QY-SECC-02",
        ratedPowerKw: 20,
        staticPowerLimitKw: 20,
        requirePreparingState: Boolean(body.requirePreparingState ?? false),
        connectors: {
          create: {
            connectorId: 1, // Single gun = 1 (REQ-DEV-003)
            standard,
            ratedPowerKw: 20,
            qrCodes: {
              create: {
                qrToken,
                isActive: true,
              },
            },
          },
        },
      },
      include: {
        site: true,
        connectors: {
          include: { qrCodes: true },
        },
      },
    });

    const auditLog = await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.roleCodes.join(","),
        action: "CHARGER_CREATED",
        targetType: "CHARGER",
        targetId: created.id,
        reason,
        afterState: {
          ocppId: created.ocppId,
          model: created.model,
          ratedPowerKw: created.ratedPowerKw,
          connectorId: 1,
          standard,
          qrToken,
        },
        isSecurity: false,
      },
    });

    const { authTokenHash, ...safeCreated } = created;

    return NextResponse.json({
      ok: true,
      charger: safeCreated,
      qrToken,
      auditLog,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
