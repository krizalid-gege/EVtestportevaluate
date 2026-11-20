import { NextResponse } from "next/server";
import { prisma, RoleCode } from "@ev-cpo/db";
import {
  requireAuth,
  requireRole,
  handleApiError,
} from "@/lib/auth";

/**
 * REQ-DEV-006, REQ-BIL-005, REQ-ADM-002:
 * Only ADMIN can modify tariffs.
 * Any attempt by CUSTOMER_SERVICE or SITE_STAFF writes a security AuditLog (isSecurity: true) and returns 403!
 * Existing TariffSnapshot rows are NEVER modified!
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const targetTariffId = body.tariffId ? String(body.tariffId) : "active-tariff";

    // RBAC Check: Rejects non-ADMIN and records UNAUTHORIZED_ATTEMPT AuditLog
    await requireRole(
      user,
      [RoleCode.ADMIN],
      "TARIFF_UPDATE",
      "TARIFF",
      targetTariffId
    );

    const energyPriceSenPerKwh = Math.round(Number(body.energyPriceSenPerKwh));
    const serviceFeeSenPerKwh = Math.round(Number(body.serviceFeeSenPerKwh));
    const taxRateBps =
      body.taxRateBps !== undefined ? Math.round(Number(body.taxRateBps)) : 600;
    const isTaxInclusive =
      body.isTaxInclusive !== undefined ? Boolean(body.isTaxInclusive) : true;
    const reason = String(body.reason || "").trim();

    if (
      Number.isNaN(energyPriceSenPerKwh) ||
      energyPriceSenPerKwh < 0 ||
      Number.isNaN(serviceFeeSenPerKwh) ||
      serviceFeeSenPerKwh < 0
    ) {
      return NextResponse.json(
        {
          errorCode: "INVALID_TARIFF_VALUES",
          message:
            "energyPriceSenPerKwh and serviceFeeSenPerKwh must be non-negative integer Sen.",
        },
        { status: 400 }
      );
    }

    if (reason.length < 3) {
      return NextResponse.json(
        {
          errorCode: "REASON_REQUIRED",
          message: "An audit reason (at least 3 characters) is required to update tariff.",
        },
        { status: 400 }
      );
    }

    let existingTariff = body.tariffId
      ? await prisma.tariff.findUnique({ where: { id: String(body.tariffId) } })
      : await prisma.tariff.findFirst({
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
        });

    const beforeState = existingTariff
      ? {
          id: existingTariff.id,
          name: existingTariff.name,
          energyPriceSenPerKwh: existingTariff.energyPriceSenPerKwh,
          serviceFeeSenPerKwh: existingTariff.serviceFeeSenPerKwh,
          taxRateBps: existingTariff.taxRateBps,
          isTaxInclusive: existingTariff.isTaxInclusive,
        }
      : null;

    let updatedTariff;
    if (existingTariff) {
      updatedTariff = await prisma.tariff.update({
        where: { id: existingTariff.id },
        data: {
          name: body.name ? String(body.name).trim() : existingTariff.name,
          energyPriceSenPerKwh,
          serviceFeeSenPerKwh,
          taxRateBps,
          isTaxInclusive,
        },
      });
    } else {
      const firstSite = await prisma.site.findFirst();
      updatedTariff = await prisma.tariff.create({
        data: {
          siteId: firstSite?.id ?? null,
          name:
            body.name
              ? String(body.name).trim()
              : "Malaysia 20kW DC Fast Tariff (Simulated MYR)",
          currency: "MYR",
          energyPriceSenPerKwh,
          serviceFeeSenPerKwh,
          taxRateBps,
          isTaxInclusive,
          isDemoPrice: true,
          isActive: true,
        },
      });
    }

    const afterState = {
      id: updatedTariff.id,
      name: updatedTariff.name,
      energyPriceSenPerKwh: updatedTariff.energyPriceSenPerKwh,
      serviceFeeSenPerKwh: updatedTariff.serviceFeeSenPerKwh,
      taxRateBps: updatedTariff.taxRateBps,
      isTaxInclusive: updatedTariff.isTaxInclusive,
    };

    const auditLog = await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.roleCodes.join(","),
        action: "TARIFF_UPDATE",
        targetType: "TARIFF",
        targetId: updatedTariff.id,
        reason,
        beforeState: beforeState ?? undefined,
        afterState,
        isSecurity: false,
      },
    });

    return NextResponse.json({
      ok: true,
      tariff: updatedTariff,
      auditLog,
      message:
        "Tariff updated and audited. Existing active/historical orders retain their immutable TariffSnapshot.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
