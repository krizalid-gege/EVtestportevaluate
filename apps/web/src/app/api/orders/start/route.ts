import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  prisma,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  UserStatus,
  ChargerConnectionStatus,
  ConnectorOcppStatus,
  generateOrderOcppIdTag,
} from "@ev-cpo/db";
import { requireAuth, jsonError, handleApiError } from "@/lib/auth";
import { sendOcppRemoteStart } from "@/lib/ocpp-client";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.AUTHORIZING,
  OrderStatus.READY_TO_START,
  OrderStatus.STARTING,
  OrderStatus.CHARGING,
  OrderStatus.STOPPING,
];

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

function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  const ms = String(now.getTime() % 10000).padStart(4, "0");
  return `MY${y}${m}${d}-${ms}${suffix}`;
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    // REQ-ACC-002: Unverified users cannot start charging!
    if (user.status === UserStatus.UNVERIFIED) {
      return jsonError(
        403,
        "EMAIL_UNVERIFIED",
        "Please verify your email before starting charging."
      );
    }

    if (user.paymentRestricted) {
      return jsonError(
        403,
        "PAYMENT_RESTRICTED",
        user.paymentRestrictNote ||
          "Your account is restricted from starting new charging sessions."
      );
    }

    const body = await req.json().catch(() => ({}));
    const qrToken = body.qrToken ? String(body.qrToken).trim() : null;
    const connectorIdInput = body.connectorId ? String(body.connectorId).trim() : null;
    const rawIdempotencyKey = body.idempotencyKey
      ? String(body.idempotencyKey).trim()
      : null;

    // 1. Check explicit idempotency key first (REQ-CHG-002)
    if (rawIdempotencyKey) {
      const existingByIdempotency = await prisma.chargingOrder.findUnique({
        where: { idempotencyKey: rawIdempotencyKey },
        include: ORDER_INCLUDE,
      });

      if (existingByIdempotency) {
        return NextResponse.json({
          ok: true,
          idempotentReplay: true,
          order: existingByIdempotency,
        });
      }
    }

    // 2. Resolve Connector from qrToken or connectorId
    let connector = null;
    if (qrToken) {
      const qr = await prisma.connectorQrCode.findUnique({
        where: { qrToken },
        include: {
          connector: {
            include: {
              charger: {
                include: { site: true },
              },
            },
          },
        },
      });
      connector = qr?.connector || null;

      if (!connector) {
        const chargerByOcpp = await prisma.charger.findFirst({
          where: { OR: [{ ocppId: qrToken }, { id: qrToken }] },
          include: {
            site: true,
            connectors: { where: { connectorId: 1 } },
          },
        });
        if (chargerByOcpp && chargerByOcpp.connectors[0]) {
          connector = {
            ...chargerByOcpp.connectors[0],
            charger: chargerByOcpp,
          };
        }
      }
    }

    if (!connector && connectorIdInput) {
      connector = await prisma.connector.findUnique({
        where: { id: connectorIdInput },
        include: {
          charger: {
            include: { site: true },
          },
        },
      });
    }

    if (!connector || !connector.charger) {
      return jsonError(404, "CONNECTOR_NOT_FOUND", "Charging connector not found.");
    }

    const { charger } = connector;
    const { site } = charger;

    // 3. Check if connector already has an active order (REQ-CHG-002 & REQ-CHG-006)
    const activeOrderOnConnector = await prisma.chargingOrder.findFirst({
      where: {
        connectorId: connector.id,
        status: { in: ACTIVE_ORDER_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      include: ORDER_INCLUDE,
    });

    if (activeOrderOnConnector) {
      if (activeOrderOnConnector.userId === user.id) {
        // Same user double-clicked or refreshed during start -> idempotent return (REQ-CHG-002 / Section 12)
        return NextResponse.json({
          ok: true,
          idempotentReplay: true,
          order: activeOrderOnConnector,
        });
      }

      // Another user owns the active session on this single-gun connector -> 409 Conflict (REQ-CHG-006)
      return jsonError(
        409,
        "CONNECTOR_OCCUPIED",
        "This connector already has an active charging session in progress."
      );
    }

    // 4. Check charger online & connector operational status (REQ-DEV-005 & REQ-CHG-001)
    if (
      !charger.isActive ||
      !connector.isEnabled ||
      charger.connectionStatus === ChargerConnectionStatus.OFFLINE ||
      connector.ocppStatus === ConnectorOcppStatus.Faulted ||
      connector.ocppStatus === ConnectorOcppStatus.Unavailable ||
      connector.ocppStatus === ConnectorOcppStatus.Charging
    ) {
      return jsonError(
        400,
        "CHARGER_UNAVAILABLE",
        `Charger ${charger.ocppId} is currently ${
          charger.connectionStatus === ChargerConnectionStatus.OFFLINE
            ? "OFFLINE"
            : connector.ocppStatus
        } and cannot accept new charging commands.`
      );
    }

    // 5. Check plug-in state if charger.requirePreparingState is enabled (REQ-CHG-001)
    if (
      charger.requirePreparingState &&
      connector.ocppStatus !== ConnectorOcppStatus.Preparing &&
      !connector.isPluggedIn
    ) {
      return jsonError(
        400,
        "GUN_NOT_PLUGGED",
        "Charging gun is not plugged into the vehicle (Preparing state required)."
      );
    }

    // 6. Fetch active Tariff and create immutable TariffSnapshot (REQ-BIL-005)
    let activeTariff = await prisma.tariff.findFirst({
      where: { siteId: site.id, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!activeTariff) {
      activeTariff = await prisma.tariff.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
      });
    }

    const tariffSnapshot = await prisma.tariffSnapshot.create({
      data: {
        tariffId: activeTariff?.id ?? null,
        name:
          activeTariff?.name ??
          "Malaysia 20kW DC Fast Trial Tariff (Simulated MYR)",
        currency: activeTariff?.currency ?? "MYR",
        energyPriceSenPerKwh: activeTariff?.energyPriceSenPerKwh ?? 120,
        serviceFeeSenPerKwh: activeTariff?.serviceFeeSenPerKwh ?? 30,
        taxRateBps: activeTariff?.taxRateBps ?? 600,
        isTaxInclusive: activeTariff?.isTaxInclusive ?? true,
        isDemoPrice: activeTariff?.isDemoPrice ?? true,
      },
    });

    // 7. Create ChargingOrder + Simulated Payment + Lifecycle Events
    const orderNo = generateOrderNo();
    const ocppIdTag = generateOrderOcppIdTag();
    const idempotencyKey =
      rawIdempotencyKey || `start-${user.id}-${connector.id}-${Date.now()}`;
    const now = new Date();
    const paymentNo = `SIM-PAY-${orderNo}`;

    const createdOrder = await prisma.chargingOrder.create({
      data: {
        orderNo,
        idempotencyKey,
        ocppIdTag,
        userId: user.id,
        siteId: site.id,
        chargerId: charger.id,
        connectorId: connector.id,
        tariffSnapshotId: tariffSnapshot.id,
        status: OrderStatus.STARTING,
        paymentMode: PaymentMode.SIMULATED,
        currency: tariffSnapshot.currency,
        authorizedAt: now,
        remoteStartSentAt: now,
        payments: {
          create: {
            paymentNo,
            mode: PaymentMode.SIMULATED,
            status: PaymentStatus.SIMULATED_PENDING,
            currency: tariffSnapshot.currency,
            authorizedAmountSen: 3000, // Simulated RM 30.00 trial authorization
            capturedAmountSen: 0,
            isSimulated: true,
            simulatedLabel: "SIMULATED PAYMENT - NO REAL CHARGE",
            events: {
              create: {
                eventType: "SIMULATED_AUTHORIZED",
                amountSen: 3000,
                status: PaymentStatus.SIMULATED_PENDING,
                payload: {
                  mode: "SIMULATED",
                  disclosure: "SIMULATED PAYMENT - NO REAL CHARGE",
                  currency: "MYR",
                },
              },
            },
          },
        },
        events: {
          create: [
            {
              fromStatus: null,
              toStatus: OrderStatus.AUTHORIZING,
              eventType: "ORDER_CREATED",
              actor: "USER",
              description: `Order ${orderNo} created with immutable TariffSnapshot (${tariffSnapshot.energyPriceSenPerKwh + tariffSnapshot.serviceFeeSenPerKwh} Sen/kWh).`,
            },
            {
              fromStatus: OrderStatus.AUTHORIZING,
              toStatus: OrderStatus.READY_TO_START,
              eventType: "SIMULATED_AUTH_OK",
              actor: "SYSTEM",
              description:
                "Phase 1A Simulated Payment authorized (RM 30.00 trial pre-auth, no real funds charged).",
            },
            {
              fromStatus: OrderStatus.READY_TO_START,
              toStatus: OrderStatus.STARTING,
              eventType: "REMOTE_START_SENT",
              actor: "SYSTEM",
              description: `Sending OCPP 1.6J RemoteStartTransaction (connectorId=${connector.connectorId}, idTag=${ocppIdTag}) to ${charger.ocppId}.`,
            },
          ],
        },
      },
      include: ORDER_INCLUDE,
    });

    // 8. Dispatch OCPP 1.6J RemoteStartTransaction via OCPP Gateway internal API
    const remoteRes = await sendOcppRemoteStart({
      ocppId: charger.ocppId,
      connectorId: connector.connectorId,
      idTag: createdOrder.ocppIdTag,
      orderId: createdOrder.id,
    });

    // 9. Re-fetch latest order state (Gateway may have already updated status or handled Rejected)
    let latestOrder = await prisma.chargingOrder.findUnique({
      where: { id: createdOrder.id },
      include: ORDER_INCLUDE,
    });

    // Fallback safety: if Gateway returned status === "Rejected" or failed and order is still STARTING, mark START_FAILED
    if (
      latestOrder &&
      latestOrder.status === OrderStatus.STARTING &&
      (remoteRes.status === "Rejected" || remoteRes.ok === false)
    ) {
      const failReason =
        remoteRes.status === "Rejected"
          ? "Charger rejected RemoteStartTransaction (Rejected)"
          : remoteRes.error || "Failed to deliver RemoteStartTransaction to charger";

      await prisma.$transaction([
        prisma.chargingOrder.update({
          where: { id: latestOrder.id },
          data: {
            status: OrderStatus.START_FAILED,
            failureReason: failReason,
          },
        }),
        prisma.chargingOrderEvent.create({
          data: {
            orderId: latestOrder.id,
            fromStatus: OrderStatus.STARTING,
            toStatus: OrderStatus.START_FAILED,
            eventType: "REMOTE_START_REJECTED",
            actor: "OCPP_CHARGER",
            description: failReason,
          },
        }),
        prisma.payment.updateMany({
          where: { orderId: latestOrder.id },
          data: {
            status: PaymentStatus.SIMULATED_CANCELLED,
            failureMessage: failReason,
          },
        }),
      ]);

      latestOrder = await prisma.chargingOrder.findUnique({
        where: { id: createdOrder.id },
        include: ORDER_INCLUDE,
      });
    }

    return NextResponse.json({
      ok: true,
      idempotentReplay: false,
      order: latestOrder || createdOrder,
      remoteStartResult: remoteRes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
