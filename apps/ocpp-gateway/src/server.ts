process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/ev_cpo_dev?schema=public";

import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  prisma,
  calculateOrderBilling,
  parseAndSanitizeOcppSampledValues,
  decodeSeccVendorDiagnostic,
  classifyOcppIdTag,
  generateOrderOcppIdTag,
  formatMyrFromSen,
  formatKwhFromWh,
  OrderStatus,
  PaymentStatus,
  PaymentMode,
  ConnectorOcppStatus,
  ChargerConnectionStatus,
} from "@ev-cpo/db";
import {
  bootEmbeddedSimulators,
  embeddedSimulators,
  DEMO_CHARGER_PROFILES,
  ChargerSimulator,
} from "./simulator/charger-sim";

const OCPP_PORT = Number(process.env.OCPP_PORT || 9000);
const OCPP_INTERNAL_PORT = Number(process.env.OCPP_INTERNAL_PORT || 9001);

export const connectedSockets = new Map<string, WebSocket>();
const pendingCsmsCalls = new Map<
  string,
  { resolve: (payload: any) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }
>();

let outboundCallSeq = 1;

const VALID_CONNECTOR_STATUSES = new Set<string>([
  "Available",
  "Preparing",
  "Charging",
  "SuspendedEVSE",
  "SuspendedEV",
  "Finishing",
  "Reserved",
  "Unavailable",
  "Faulted",
]);

function toConnectorOcppStatus(statusStr: string | undefined): ConnectorOcppStatus {
  if (statusStr && VALID_CONNECTOR_STATUSES.has(statusStr)) {
    return statusStr as ConnectorOcppStatus;
  }
  return ConnectorOcppStatus.Available;
}

async function recordOcppMessage(params: {
  ocppId: string;
  chargerId?: string | null;
  direction: "INBOUND" | "OUTBOUND";
  messageTypeId: number;
  uniqueId: string;
  action?: string | null;
  orderId?: string | null;
  transactionId?: number | null;
  payload: any;
}): Promise<void> {
  try {
    let chargerId = params.chargerId;
    if (!chargerId) {
      const chg = await prisma.charger.findUnique({
        where: { ocppId: params.ocppId },
        select: { id: true },
      });
      if (!chg) return;
      chargerId = chg.id;
    }

    await prisma.ocppMessage.create({
      data: {
        chargerId,
        ocppId: params.ocppId,
        direction: params.direction,
        messageTypeId: params.messageTypeId,
        uniqueId: String(params.uniqueId),
        action: params.action || null,
        orderId: params.orderId || null,
        transactionId:
          typeof params.transactionId === "number" && !Number.isNaN(params.transactionId)
            ? params.transactionId
            : null,
        payload: params.payload ?? {},
      },
    });
  } catch (err) {
    console.warn(`[OCPP Log] Could not persist message for ${params.ocppId}:`, (err as Error).message);
  }
}

export async function sendCsmsCall(
  ocppId: string,
  action: string,
  payload: Record<string, any>,
  options: { orderId?: string | null; transactionId?: number | null; timeoutMs?: number } = {}
): Promise<any> {
  const ws = connectedSockets.get(ocppId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error(`Charger ${ocppId} is not connected to OCPP Gateway`);
  }

  const uniqueId = `csms-${Date.now()}-${outboundCallSeq++}`;
  const timeoutMs = options.timeoutMs ?? 10000;

  await recordOcppMessage({
    ocppId,
    direction: "OUTBOUND",
    messageTypeId: 2,
    uniqueId,
    action,
    orderId: options.orderId,
    transactionId: options.transactionId,
    payload,
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCsmsCalls.delete(uniqueId);
      reject(new Error(`OCPP CALL timeout (${timeoutMs}ms) waiting for ${ocppId} -> ${action}`));
    }, timeoutMs);

    pendingCsmsCalls.set(uniqueId, {
      resolve: async (resPayload) => {
        await recordOcppMessage({
          ocppId,
          direction: "INBOUND",
          messageTypeId: 3,
          uniqueId,
          action,
          orderId: options.orderId,
          transactionId: options.transactionId,
          payload: resPayload,
        });
        resolve(resPayload);
      },
      reject,
      timer,
    });

    ws.send(JSON.stringify([2, uniqueId, action, payload]));
  });
}

async function sendCallResultToCharger(
  ws: WebSocket,
  ocppId: string,
  chargerId: string | null,
  uniqueId: string,
  action: string,
  payload: Record<string, any>,
  meta: { orderId?: string | null; transactionId?: number | null } = {}
): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify([3, uniqueId, payload]));
  }
  await recordOcppMessage({
    ocppId,
    chargerId,
    direction: "OUTBOUND",
    messageTypeId: 3,
    uniqueId,
    action,
    orderId: meta.orderId,
    transactionId: meta.transactionId,
    payload,
  });
}

async function handleInboundChargerCall(
  ws: WebSocket,
  ocppId: string,
  uniqueId: string,
  action: string,
  payload: any
): Promise<void> {
  const charger = await prisma.charger.findUnique({
    where: { ocppId },
    include: { connectors: true },
  });

  await recordOcppMessage({
    ocppId,
    chargerId: charger?.id ?? null,
    direction: "INBOUND",
    messageTypeId: 2,
    uniqueId,
    action,
    transactionId: typeof payload?.transactionId === "number" ? payload.transactionId : null,
    payload,
  });

  if (!charger) {
    await sendCallResultToCharger(ws, ocppId, null, uniqueId, action, { status: "Rejected" });
    return;
  }

  const now = new Date();

  switch (action) {
    case "BootNotification": {
      await prisma.charger.update({
        where: { id: charger.id },
        data: {
          vendor: payload.chargePointVendor || charger.vendor,
          model: payload.chargePointModel || charger.model,
          serialNumber: payload.chargePointSerialNumber || charger.serialNumber,
          firmwareVersion: payload.firmwareVersion || charger.firmwareVersion,
          connectionStatus: ChargerConnectionStatus.ONLINE,
          lastBootAt: now,
          lastConnectedAt: now,
          lastHeartbeatAt: now,
        },
      });

      await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {
        status: "Accepted",
        currentTime: now.toISOString(),
        interval: 30,
      });

      setTimeout(() => {
        sendCsmsCall(ocppId, "ChangeConfiguration", {
          key: "MeterValuesSampledData",
          value:
            "Energy.Active.Import.Register,Power.Active.Import,Voltage,Current.Import,SoC,Temperature",
        }).catch(() => {});
      }, 500);
      return;
    }

    case "Heartbeat": {
      await prisma.charger.update({
        where: { id: charger.id },
        data: {
          lastHeartbeatAt: now,
          connectionStatus: ChargerConnectionStatus.ONLINE,
        },
      });
      await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {
        currentTime: now.toISOString(),
      });
      return;
    }

    case "StatusNotification": {
      const connectorNum = Number(payload.connectorId ?? 0);
      const statusEnum = toConnectorOcppStatus(payload.status);
      const decodedStage = decodeSeccVendorDiagnostic(payload.vendorErrorCode, payload.info);

      if (connectorNum === 0) {
        await prisma.charger.update({
          where: { id: charger.id },
          data: {
            controllerOcppStatus: statusEnum,
            controllerErrorCode: payload.errorCode || "NoError",
            vendorErrorCode: payload.vendorErrorCode || null,
            seccStageInfo: decodedStage || charger.seccStageInfo,
            connectionStatus: ChargerConnectionStatus.ONLINE,
            lastHeartbeatAt: now,
          },
        });
      } else {
        const isPluggedIn = [
          "Preparing",
          "Charging",
          "SuspendedEV",
          "SuspendedEVSE",
          "Finishing",
        ].includes(String(payload.status));

        const targetConnector =
          charger.connectors.find((c) => c.connectorId === connectorNum) || charger.connectors[0];

        if (targetConnector) {
          await prisma.connector.update({
            where: { id: targetConnector.id },
            data: {
              ocppStatus: statusEnum,
              errorCode: payload.errorCode || "NoError",
              vendorErrorCode: payload.vendorErrorCode || null,
              errorInfo: payload.info || null,
              isPluggedIn,
              lastStatusAt: now,
            },
          });
        }

        await prisma.charger.update({
          where: { id: charger.id },
          data: {
            vendorErrorCode: payload.vendorErrorCode || charger.vendorErrorCode,
            seccStageInfo: decodedStage || charger.seccStageInfo,
            connectionStatus: ChargerConnectionStatus.ONLINE,
          },
        });

        if (statusEnum === ConnectorOcppStatus.Faulted) {
          await prisma.alert.create({
            data: {
              chargerId: charger.id,
              alertType: "SECC_HARDWARE_FAULT",
              severity: "CRITICAL",
              status: "OPEN",
              title: `SECC / Charger Hardware Fault on ${charger.ocppId}`,
              description: `Connector #${connectorNum} reported Faulted (${payload.errorCode || "OtherError"}): ${decodedStage || payload.info || "Hardware Fault"}`,
            },
          });
        }
      }

      await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {});
      return;
    }

    case "Authorize": {
      const classified = classifyOcppIdTag(String(payload.idTag || ""));
      await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {
        idTagInfo: {
          status: classified.valid ? "Accepted" : "Invalid",
        },
      });
      return;
    }

    case "StartTransaction": {
      const idTag = String(payload.idTag || "").trim();
      const connectorNum = Number(payload.connectorId || 1);
      const meterStartWh = Math.round(Number(payload.meterStart) || 0);
      const startedAt = payload.timestamp ? new Date(payload.timestamp) : now;
      const targetConnector =
        charger.connectors.find((c) => c.connectorId === connectorNum) || charger.connectors[0];

      if (!targetConnector) {
        await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {
          transactionId: 0,
          idTagInfo: { status: "Rejected" },
        });
        return;
      }

      // Matching order lookup
      let matchingOrder = await prisma.chargingOrder.findUnique({
        where: { ocppIdTag: idTag },
        include: { ocppTransaction: true },
      });

      if (!matchingOrder) {
        matchingOrder = await prisma.chargingOrder.findFirst({
          where: {
            chargerId: charger.id,
            connectorId: targetConnector.id,
            status: { in: [OrderStatus.STARTING, OrderStatus.READY_TO_START] },
          },
          orderBy: { createdAt: "desc" },
          include: { ocppTransaction: true },
        });
      }

      // REQ-CHG-005 Idempotency check: existing transaction on this order or within 60s for (chargerId, idTag)
      if (matchingOrder?.ocppTransaction) {
        await sendCallResultToCharger(
          ws,
          ocppId,
          charger.id,
          uniqueId,
          action,
          {
            transactionId: matchingOrder.ocppTransaction.transactionId,
            idTagInfo: { status: "Accepted" },
          },
          {
            orderId: matchingOrder.id,
            transactionId: matchingOrder.ocppTransaction.transactionId,
          }
        );
        return;
      }

      const recentTx = await prisma.ocppTransaction.findFirst({
        where: {
          chargerId: charger.id,
          idTag,
          stoppedAt: null,
          startedAt: {
            gte: new Date(startedAt.getTime() - 60000),
            lte: new Date(startedAt.getTime() + 60000),
          },
        },
      });

      if (recentTx) {
        await sendCallResultToCharger(
          ws,
          ocppId,
          charger.id,
          uniqueId,
          action,
          {
            transactionId: recentTx.transactionId,
            idTagInfo: { status: "Accepted" },
          },
          { orderId: recentTx.orderId, transactionId: recentTx.transactionId }
        );
        return;
      }

      const transactionId =
        (Math.floor(Date.now() / 1000) % 100000000) + Math.floor(Math.random() * 1000) + 1;

      await prisma.$transaction(async (tx) => {
        await tx.ocppTransaction.create({
          data: {
            transactionId,
            chargerId: charger.id,
            connectorId: targetConnector.id,
            orderId: matchingOrder?.id ?? null,
            idTag,
            meterStartWh,
            lastMeterWh: meterStartWh,
            startedAt,
            rawStartPayload: payload,
          },
        });

        if (matchingOrder) {
          const prevStatus = matchingOrder.status;
          await tx.chargingOrder.update({
            where: { id: matchingOrder.id },
            data: {
              status: OrderStatus.CHARGING,
              meterStartWh,
              meterCurrentWh: meterStartWh,
              chargingStartedAt: now,
              seccDiagnosticCode: "0x18 CurrentDemand (Charging Active)",
            },
          });

          await tx.chargingOrderEvent.create({
            data: {
              orderId: matchingOrder.id,
              fromStatus: prevStatus,
              toStatus: OrderStatus.CHARGING,
              eventType: "OCPP_START_TRANSACTION",
              actor: "OCPP_CHARGER",
              description: "Received valid OCPP StartTransaction from charger",
              metadata: { transactionId, meterStartWh, idTag },
            },
          });
        }

        await tx.connector.update({
          where: { id: targetConnector.id },
          data: {
            ocppStatus: ConnectorOcppStatus.Charging,
            isPluggedIn: true,
            lastStatusAt: now,
          },
        });

        await tx.charger.update({
          where: { id: charger.id },
          data: {
            lastTransactionAt: now,
            seccStageInfo: "0x18 CurrentDemand Req (Active Charging)",
          },
        });
      });

      await sendCallResultToCharger(
        ws,
        ocppId,
        charger.id,
        uniqueId,
        action,
        {
          transactionId,
          idTagInfo: { status: "Accepted" },
        },
        { orderId: matchingOrder?.id ?? null, transactionId }
      );
      return;
    }

    case "MeterValues": {
      const txId = typeof payload.transactionId === "number" ? payload.transactionId : null;
      const connectorNum = Number(payload.connectorId || 1);
      const targetConnector =
        charger.connectors.find((c) => c.connectorId === connectorNum) || charger.connectors[0];

      let ocppTx = txId
        ? await prisma.ocppTransaction.findUnique({
            where: { transactionId: txId },
            include: {
              order: {
                include: { tariffSnapshot: true },
              },
            },
          })
        : null;

      let order = ocppTx?.order ?? null;
      if (!order && targetConnector) {
        order = await prisma.chargingOrder.findFirst({
          where: {
            chargerId: charger.id,
            connectorId: targetConnector.id,
            status: OrderStatus.CHARGING,
          },
          orderBy: { createdAt: "desc" },
          include: { tariffSnapshot: true },
        });
      }

      const meterEntries = Array.isArray(payload.meterValue) ? payload.meterValue : [];
      let latestSoc = order?.lastValidSocPercent ?? ocppTx?.lastValidSocPercent ?? null;

      for (const entry of meterEntries) {
        const sampledValues = Array.isArray(entry?.sampledValue) ? entry.sampledValue : [];
        const sample = parseAndSanitizeOcppSampledValues(sampledValues, latestSoc);
        if (sample.socPercent !== null) {
          latestSoc = sample.socPercent;
        }

        const sampledAt = entry?.timestamp ? new Date(entry.timestamp) : now;
        const energyRegisterWh =
          sample.energyRegisterWh ??
          order?.meterCurrentWh ??
          order?.meterStartWh ??
          ocppTx?.lastMeterWh ??
          0;

        if (targetConnector) {
          await prisma.meterValue.create({
            data: {
              chargerId: charger.id,
              connectorId: targetConnector.id,
              ocppTransactionId: ocppTx?.id ?? null,
              orderId: order?.id ?? null,
              sampledAt,
              energyRegisterWh,
              powerW: sample.powerW,
              voltageV: sample.voltageV,
              currentA: sample.currentA,
              socPercent: sample.socPercent,
              temperatureC: sample.temperatureC,
              rawSampledValue: sampledValues,
            },
          });

          if (sample.temperatureC !== null) {
            await prisma.connector.update({
              where: { id: targetConnector.id },
              data: { gunTemp1C: sample.temperatureC },
            });
          }
        }

        if (ocppTx) {
          await prisma.ocppTransaction.update({
            where: { id: ocppTx.id },
            data: {
              lastMeterWh: energyRegisterWh,
              lastValidSocPercent: latestSoc,
            },
          });
        }

        if (order && order.tariffSnapshot) {
          const meterStartWh = order.meterStartWh ?? ocppTx?.meterStartWh ?? energyRegisterWh;
          const meterCurrentWh = energyRegisterWh;
          const chargedEnergyWh = Math.max(0, meterCurrentWh - meterStartWh);
          const billing = calculateOrderBilling(chargedEnergyWh, order.tariffSnapshot);

          order = await prisma.chargingOrder.update({
            where: { id: order.id },
            data: {
              meterCurrentWh,
              chargedEnergyWh,
              currentPowerW: sample.powerW ?? order.currentPowerW,
              currentVoltageV: sample.voltageV ?? order.currentVoltageV,
              currentAmpereA: sample.currentA ?? order.currentAmpereA,
              lastValidSocPercent: latestSoc ?? order.lastValidSocPercent,
              energyAmountSen: billing.energyAmountSen,
              serviceAmountSen: billing.serviceAmountSen,
              subtotalAmountSen: billing.subtotalAmountSen,
              taxAmountSen: billing.taxAmountSen,
              totalAmountSen: billing.totalAmountSen,
            },
            include: { tariffSnapshot: true },
          });
        }
      }

      await sendCallResultToCharger(
        ws,
        ocppId,
        charger.id,
        uniqueId,
        action,
        {},
        { orderId: order?.id ?? null, transactionId: txId }
      );
      return;
    }

    case "StopTransaction": {
      const txId = Number(payload.transactionId);
      const ocppTx = !Number.isNaN(txId)
        ? await prisma.ocppTransaction.findUnique({
            where: { transactionId: txId },
            include: {
              order: {
                include: {
                  tariffSnapshot: true,
                  user: true,
                  payments: true,
                },
              },
            },
          })
        : null;

      if (!ocppTx) {
        await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {
          idTagInfo: { status: "Accepted" },
        });
        return;
      }

      const order = ocppTx.order;

      // REQ-CHG-005 / Acceptance Criterion 4: Duplicate StopTransaction Idempotency
      if (
        ocppTx.stoppedAt !== null ||
        order?.status === OrderStatus.COMPLETED ||
        order?.status === OrderStatus.MANUAL_REVIEW
      ) {
        await prisma.ocppTransaction.update({
          where: { id: ocppTx.id },
          data: { isDuplicateStopSeen: true },
        });

        if (order) {
          await prisma.chargingOrderEvent.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: order.status,
              eventType: "DUPLICATE_STOP_IGNORED",
              actor: "OCPP_CHARGER",
              description:
                "Duplicate StopTransaction received; idempotently ignored without duplicate order or simulated payment",
              metadata: { transactionId: txId },
            },
          });
        }

        await sendCallResultToCharger(
          ws,
          ocppId,
          charger.id,
          uniqueId,
          action,
          { idTagInfo: { status: "Accepted" } },
          { orderId: order?.id ?? null, transactionId: txId }
        );
        return;
      }

      // Process embedded transactionData meter values for final SoC (protecting against trailing 0% BSD quirk)
      let finalValidSoc = order?.lastValidSocPercent ?? ocppTx.lastValidSocPercent ?? null;
      if (Array.isArray(payload.transactionData)) {
        for (const td of payload.transactionData) {
          if (Array.isArray(td?.sampledValue)) {
            const sample = parseAndSanitizeOcppSampledValues(td.sampledValue, finalValidSoc);
            if (sample.socPercent !== null) {
              finalValidSoc = sample.socPercent;
            }
          }
        }
      }

      const meterStopWh = Math.round(Number(payload.meterStop) || 0);
      const chargedEnergyWh = meterStopWh - ocppTx.meterStartWh;
      const stopReason = String(payload.reason || "Local");

      // Section 12 Anomaly Protection: Negative or > 500,000 Wh (500 kWh on 20kW charger)
      if (chargedEnergyWh < 0 || chargedEnergyWh > 500000) {
        await prisma.$transaction(async (tx) => {
          await tx.ocppTransaction.update({
            where: { id: ocppTx.id },
            data: {
              meterStopWh,
              lastMeterWh: meterStopWh,
              lastValidSocPercent: finalValidSoc,
              stoppedAt: now,
              stopReason,
              rawStopPayload: payload,
            },
          });

          if (order) {
            await tx.chargingOrder.update({
              where: { id: order.id },
              data: {
                status: OrderStatus.MANUAL_REVIEW,
                meterStopWh,
                meterCurrentWh: meterStopWh,
                currentPowerW: 0,
                currentAmpereA: 0,
                lastValidSocPercent: finalValidSoc,
                chargingStoppedAt: now,
                stopReason,
                manualReviewReason: "Abnormal meter reading",
              },
            });

            await tx.chargingOrderEvent.create({
              data: {
                orderId: order.id,
                fromStatus: order.status,
                toStatus: OrderStatus.MANUAL_REVIEW,
                eventType: "ORDER_ANOMALY_MANUAL_REVIEW",
                actor: "SYSTEM",
                description: `Abnormal meter reading detected (meterStart=${ocppTx.meterStartWh} Wh, meterStop=${meterStopWh} Wh, delta=${chargedEnergyWh} Wh)`,
              },
            });
          }

          await tx.alert.create({
            data: {
              chargerId: charger.id,
              orderId: order?.id ?? null,
              alertType: "ORDER_ANOMALY",
              severity: "CRITICAL",
              status: "OPEN",
              title: `Abnormal Meter Reading on ${charger.ocppId}`,
              description: `Transaction #${txId} reported abnormal energy delta (${chargedEnergyWh} Wh). Transitioned to MANUAL_REVIEW without capturing payment.`,
            },
          });
        });

        await sendCallResultToCharger(
          ws,
          ocppId,
          charger.id,
          uniqueId,
          action,
          { idTagInfo: { status: "Accepted" } },
          { orderId: order?.id ?? null, transactionId: txId }
        );
        return;
      }

      // Normal Settlement Path (REQ-CHG-008, REQ-BIL-006)
      let settledOrderNo = order?.orderNo || "";
      let settledTotalSen = 0;
      let userEmail = order?.user?.email || "";
      let userId = order?.userId || "";

      await prisma.$transaction(async (tx) => {
        await tx.ocppTransaction.update({
          where: { id: ocppTx.id },
          data: {
            meterStopWh,
            lastMeterWh: meterStopWh,
            lastValidSocPercent: finalValidSoc,
            stoppedAt: now,
            stopReason,
            rawStopPayload: payload,
          },
        });

        if (order && order.tariffSnapshot) {
          const billing = calculateOrderBilling(chargedEnergyWh, order.tariffSnapshot);
          settledTotalSen = billing.totalAmountSen;

          await tx.chargingOrder.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.COMPLETED,
              meterStopWh,
              meterCurrentWh: meterStopWh,
              chargedEnergyWh,
              currentPowerW: 0,
              currentAmpereA: 0,
              lastValidSocPercent: finalValidSoc,
              energyAmountSen: billing.energyAmountSen,
              serviceAmountSen: billing.serviceAmountSen,
              subtotalAmountSen: billing.subtotalAmountSen,
              taxAmountSen: billing.taxAmountSen,
              totalAmountSen: billing.totalAmountSen,
              chargingStoppedAt: now,
              settledAt: now,
              stopReason,
              seccDiagnosticCode: "0x1E SessionStop (Welding Detection Complete)",
            },
          });

          await tx.chargingOrderEvent.create({
            data: {
              orderId: order.id,
              fromStatus: OrderStatus.CHARGING,
              toStatus: OrderStatus.COMPLETED,
              eventType: "OCPP_STOP_AND_SETTLED",
              actor: "OCPP_CHARGER",
              description: `Session completed (${formatKwhFromWh(chargedEnergyWh)}) and settled at ${formatMyrFromSen(billing.totalAmountSen)} (SIMULATED)`,
              metadata: {
                transactionId: txId,
                meterStartWh: ocppTx.meterStartWh,
                meterStopWh,
                chargedEnergyWh,
                billing: { ...billing },
              },
            },
          });

          // Invariant 3 (REQ-BIL-006): Ensure exactly ONE SIMULATED_SUCCEEDED Payment exists for this order
          const existingPayments = await tx.payment.findMany({
            where: { orderId: order.id },
            orderBy: { createdAt: "asc" },
          });

          const alreadySucceeded = existingPayments.find(
            (p) => p.status === PaymentStatus.SIMULATED_SUCCEEDED
          );

          if (alreadySucceeded) {
            await tx.payment.update({
              where: { id: alreadySucceeded.id },
              data: {
                capturedAmountSen: billing.totalAmountSen,
                settledAt: now,
                simulatedLabel: "SIMULATED - NO REAL FUNDS CHARGED",
              },
            });
          } else if (existingPayments.length > 0) {
            const primaryPayment = existingPayments[0];
            await tx.payment.update({
              where: { id: primaryPayment.id },
              data: {
                status: PaymentStatus.SIMULATED_SUCCEEDED,
                capturedAmountSen: billing.totalAmountSen,
                settledAt: now,
                isSimulated: true,
                simulatedLabel: "SIMULATED - NO REAL FUNDS CHARGED",
              },
            });

            await tx.paymentEvent.create({
              data: {
                paymentId: primaryPayment.id,
                eventType: "SIMULATED_SUCCEEDED",
                amountSen: billing.totalAmountSen,
                status: PaymentStatus.SIMULATED_SUCCEEDED,
                payload: {
                  orderNo: order.orderNo,
                  chargedEnergyWh,
                  totalAmountSen: billing.totalAmountSen,
                  note: "SIMULATED - NO REAL FUNDS CHARGED",
                },
              },
            });
          } else {
            const paymentNo = `SIM-PAY-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
            const createdPay = await tx.payment.create({
              data: {
                paymentNo,
                orderId: order.id,
                mode: PaymentMode.SIMULATED,
                status: PaymentStatus.SIMULATED_SUCCEEDED,
                currency: "MYR",
                authorizedAmountSen: billing.totalAmountSen,
                capturedAmountSen: billing.totalAmountSen,
                isSimulated: true,
                simulatedLabel: "SIMULATED - NO REAL FUNDS CHARGED",
                settledAt: now,
              },
            });

            await tx.paymentEvent.create({
              data: {
                paymentId: createdPay.id,
                eventType: "SIMULATED_SUCCEEDED",
                amountSen: billing.totalAmountSen,
                status: PaymentStatus.SIMULATED_SUCCEEDED,
                payload: {
                  orderNo: order.orderNo,
                  chargedEnergyWh,
                  totalAmountSen: billing.totalAmountSen,
                  note: "SIMULATED - NO REAL FUNDS CHARGED",
                },
              },
            });
          }
        }

        // Update Connector: Finishing -> Preparing
        await tx.connector.update({
          where: { id: ocppTx.connectorId },
          data: {
            ocppStatus: ConnectorOcppStatus.Finishing,
            lastStatusAt: now,
          },
        });
      });

      // Transition Connector to Preparing shortly after Finishing
      await prisma.connector
        .update({
          where: { id: ocppTx.connectorId },
          data: {
            ocppStatus: ConnectorOcppStatus.Preparing,
            lastStatusAt: new Date(),
          },
        })
        .catch(() => {});

      // REQ-ADM-004: Create in-app Notification and EmailDelivery wrapped in try/catch
      if (order && userId) {
        try {
          await prisma.notification.create({
            data: {
              userId,
              orderId: order.id,
              title: `Charging Receipt ${settledOrderNo} (SIMULATED)`,
              body: `Charged ${formatKwhFromWh(chargedEnergyWh)} on ${charger.ocppId}. Total: ${formatMyrFromSen(settledTotalSen)} (SIMULATED - NO REAL FUNDS CHARGED).`,
              type: "ORDER_RECEIPT",
            },
          });

          if (userEmail) {
            await prisma.emailDelivery.create({
              data: {
                toEmail: userEmail,
                subject: `[SIMULATED RECEIPT] Malaysia EV Charging Order ${settledOrderNo} - ${formatMyrFromSen(settledTotalSen)}`,
                templateCode: "ORDER_RECEIPT_SIMULATED",
                orderId: order.id,
                status: "SENT_DEMO",
                sentAt: now,
                bodyHtml: `<div style="font-family:sans-serif">
                  <h2>Charging Receipt (${settledOrderNo})</h2>
                  <p><strong>SIMULATED / TEST ORDER — NO REAL FUNDS CHARGED</strong></p>
                  <p>Charger: ${charger.ocppId}</p>
                  <p>Energy Delivered: ${formatKwhFromWh(chargedEnergyWh)} (${chargedEnergyWh} Wh)</p>
                  <p>Total Settled: <strong>${formatMyrFromSen(settledTotalSen)}</strong> (incl. 6% SST)</p>
                </div>`,
              },
            });
          }
        } catch (emailErr) {
          console.warn("[Notification/Email] Non-fatal error recording receipt:", emailErr);
        }
      }

      await sendCallResultToCharger(
        ws,
        ocppId,
        charger.id,
        uniqueId,
        action,
        { idTagInfo: { status: "Accepted" } },
        { orderId: order?.id ?? null, transactionId: txId }
      );
      return;
    }

    case "DataTransfer": {
      await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {
        status: "Accepted",
      });
      return;
    }

    default: {
      await sendCallResultToCharger(ws, ocppId, charger.id, uniqueId, action, {});
      return;
    }
  }
}

// ============================================================================
// WebSocket OCPP 1.6J Server (Port 9000)
// ============================================================================
const wsHttpServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      service: "ev-cpo-ocpp16j-gateway",
      ok: true,
      connectedChargers: Array.from(connectedSockets.keys()),
    })
  );
});

const wss = new WebSocketServer({
  server: wsHttpServer,
  handleProtocols: (protocols) => {
    if (protocols.has("ocpp1.6")) return "ocpp1.6";
    return protocols.values().next().value || false;
  },
});

wss.on("connection", async (ws, req) => {
  const rawUrl = req.url || "/";
  const pathname = rawUrl.split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  // Supports /ocpp/:ocppId or /:ocppId
  const ocppId = segments[0] === "ocpp" ? segments[1] : segments[0];

  if (!ocppId) {
    ws.close(1008, "Missing OCPP ChargePoint ID in URL path");
    return;
  }

  connectedSockets.set(ocppId, ws);

  const charger = await prisma.charger.findUnique({ where: { ocppId } });
  let connectionLogId: string | null = null;
  if (charger) {
    await prisma.charger
      .update({
        where: { id: charger.id },
        data: {
          connectionStatus: ChargerConnectionStatus.ONLINE,
          lastConnectedAt: new Date(),
        },
      })
      .catch(() => {});

    const connRecord = await prisma.ocppConnection
      .create({
        data: {
          chargerId: charger.id,
          remoteAddress: req.socket.remoteAddress || "127.0.0.1",
          protocol: "ocpp1.6",
        },
      })
      .catch(() => null);
    connectionLogId = connRecord?.id ?? null;
  }

  ws.on("message", (raw) => {
    let parsed: any;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;

    const [messageTypeId, uniqueId, third, fourth] = parsed;

    if (messageTypeId === 2) {
      const action = String(third);
      const payload = fourth || {};
      handleInboundChargerCall(ws, ocppId, String(uniqueId), action, payload).catch((err) => {
        console.error(`[OCPP Gateway] Error handling ${ocppId} ${action}:`, err);
      });
    } else if (messageTypeId === 3) {
      const pending = pendingCsmsCalls.get(String(uniqueId));
      if (pending) {
        clearTimeout(pending.timer);
        pendingCsmsCalls.delete(String(uniqueId));
        pending.resolve(third || {});
      }
    } else if (messageTypeId === 4) {
      const pending = pendingCsmsCalls.get(String(uniqueId));
      if (pending) {
        clearTimeout(pending.timer);
        pendingCsmsCalls.delete(String(uniqueId));
        pending.reject(new Error(`OCPP CALLERROR from ${ocppId}: ${third} - ${fourth}`));
      }
    }
  });

  ws.on("close", async () => {
    if (connectedSockets.get(ocppId) === ws) {
      connectedSockets.delete(ocppId);
    }
    if (charger) {
      await prisma.charger
        .update({
          where: { id: charger.id },
          data: {
            connectionStatus: ChargerConnectionStatus.OFFLINE,
            lastDisconnectedAt: new Date(),
          },
        })
        .catch(() => {});
    }
    if (connectionLogId) {
      await prisma.ocppConnection
        .update({
          where: { id: connectionLogId },
          data: { disconnectedAt: new Date(), disconnectNote: "WebSocket closed" },
        })
        .catch(() => {});
    }
  });
});

// ============================================================================
// Helper: Handle RemoteStartTransaction (shared by HTTP API & Scenario Runner)
// ============================================================================
export async function executeRemoteStartForOrder(params: {
  ocppId: string;
  connectorId?: number;
  idTag: string;
  orderId?: string;
}): Promise<{ ok: boolean; status: string; error?: string }> {
  const { ocppId, idTag, orderId } = params;
  const connectorId = params.connectorId ?? 1;

  let responseStatus = "Rejected";
  let errorMsg: string | undefined;

  try {
    const res = await sendCsmsCall(
      ocppId,
      "RemoteStartTransaction",
      {
        connectorId,
        idTag,
      },
      { orderId: orderId ?? null, timeoutMs: 10000 }
    );
    responseStatus = String(res?.status || "Rejected");
  } catch (err: any) {
    responseStatus = "Rejected";
    errorMsg = err?.message || "Charger unavailable or timed out";
  }

  if (responseStatus !== "Accepted") {
    if (orderId) {
      const existingOrder = await prisma.chargingOrder.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (existingOrder) {
        await prisma.$transaction(async (tx) => {
          await tx.chargingOrder.update({
            where: { id: existingOrder.id },
            data: {
              status: OrderStatus.START_FAILED,
              failureReason: errorMsg || "Charger rejected RemoteStartTransaction",
              seccDiagnosticCode: "0xB4 GQ_CROAA_TIMEOUT / RemoteStart Rejected",
            },
          });

          await tx.chargingOrderEvent.create({
            data: {
              orderId: existingOrder.id,
              fromStatus: existingOrder.status,
              toStatus: OrderStatus.START_FAILED,
              eventType: "REMOTE_START_REJECTED",
              actor: "OCPP_CHARGER",
              description: errorMsg || "Charger rejected RemoteStartTransaction",
            },
          });

          for (const pay of existingOrder.payments) {
            if (pay.status === PaymentStatus.SIMULATED_PENDING) {
              await tx.payment.update({
                where: { id: pay.id },
                data: {
                  status: PaymentStatus.SIMULATED_CANCELLED,
                  failureCode: "REMOTE_START_REJECTED",
                  failureMessage: "Charger rejected RemoteStartTransaction; authorization cancelled",
                },
              });

              await tx.paymentEvent.create({
                data: {
                  paymentId: pay.id,
                  eventType: "SIMULATED_CANCELLED",
                  amountSen: 0,
                  status: PaymentStatus.SIMULATED_CANCELLED,
                  payload: { reason: "Charger rejected RemoteStartTransaction" },
                },
              });
            }
          }
        });
      }
    }

    return { ok: false, status: "Rejected", error: errorMsg };
  }

  // Accepted: REQ-CHG-003 keep order in STARTING until StartTransaction arrives
  if (orderId) {
    const existingOrder = await prisma.chargingOrder.findUnique({ where: { id: orderId } });
    if (existingOrder) {
      await prisma.$transaction(async (tx) => {
        await tx.chargingOrder.update({
          where: { id: existingOrder.id },
          data: {
            status:
              existingOrder.status === OrderStatus.CHARGING
                ? OrderStatus.CHARGING
                : OrderStatus.STARTING,
            remoteStartSentAt: new Date(),
            seccDiagnosticCode: "0x03 SLAC -> 0x12 CableCheck (30s IMD) -> 0x14 PreCharge",
          },
        });

        await tx.chargingOrderEvent.create({
          data: {
            orderId: existingOrder.id,
            fromStatus: existingOrder.status,
            toStatus: OrderStatus.STARTING,
            eventType: "REMOTE_START_ACCEPTED",
            actor: "OCPP_CHARGER",
            description:
              "Charger accepted RemoteStartTransaction; awaiting SECC CableCheck, PreCharge & StartTransaction",
          },
        });
      });
    }
  }

  return { ok: true, status: "Accepted" };
}

// ============================================================================
// Helper: Ensure a fresh demo order exists for automated scenario testing
// ============================================================================
async function createOrLoadScenarioOrder(ocppId: string, existingOrderId?: string) {
  if (existingOrderId) {
    const found = await prisma.chargingOrder.findUnique({
      where: { id: existingOrderId },
      include: { charger: true, connector: true, payments: true, ocppTransaction: true },
    });
    if (found) return found;
  }

  const charger = await prisma.charger.findUnique({
    where: { ocppId },
    include: { connectors: true, site: { include: { tariffs: true } } },
  });
  if (!charger || charger.connectors.length === 0) {
    throw new Error(`Charger ${ocppId} or its connector not found in database`);
  }

  const connector = charger.connectors[0];
  const driver =
    (await prisma.user.findUnique({ where: { email: "driver@ev-cpo.my" } })) ||
    (await prisma.user.findFirst());
  if (!driver) {
    throw new Error("No user found in database to own scenario charging order");
  }

  const activeTariff =
    charger.site.tariffs[0] || (await prisma.tariff.findFirst({ where: { isActive: true } }));

  const snapshot = await prisma.tariffSnapshot.create({
    data: {
      tariffId: activeTariff?.id ?? null,
      name: activeTariff?.name ?? "Malaysia Standard DC Fast Charging Tariff",
      currency: "MYR",
      energyPriceSenPerKwh: activeTariff?.energyPriceSenPerKwh ?? 120,
      serviceFeeSenPerKwh: activeTariff?.serviceFeeSenPerKwh ?? 30,
      taxRateBps: activeTariff?.taxRateBps ?? 600,
      isTaxInclusive: activeTariff?.isTaxInclusive ?? true,
      isDemoPrice: true,
    },
  });

  const ocppIdTag = generateOrderOcppIdTag();
  const suffix = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
  const orderNo = `MY20261120-${suffix}`;
  const now = new Date();

  const order = await prisma.chargingOrder.create({
    data: {
      orderNo,
      idempotencyKey: `sim-idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ocppIdTag,
      userId: driver.id,
      siteId: charger.siteId,
      chargerId: charger.id,
      connectorId: connector.id,
      tariffSnapshotId: snapshot.id,
      status: OrderStatus.STARTING,
      paymentMode: PaymentMode.SIMULATED,
      authorizedAt: now,
      remoteStartSentAt: now,
      events: {
        create: [
          {
            fromStatus: OrderStatus.DRAFT,
            toStatus: OrderStatus.READY_TO_START,
            eventType: "SIMULATED_PAYMENT_AUTHORIZED",
            actor: "USER",
            description: "Simulated payment pre-authorized (SIMULATED - NO REAL FUNDS CHARGED)",
          },
          {
            fromStatus: OrderStatus.READY_TO_START,
            toStatus: OrderStatus.STARTING,
            eventType: "REMOTE_START_REQUESTED",
            actor: "USER",
            description: `Initiated RemoteStartTransaction on ${ocppId}`,
          },
        ],
      },
      payments: {
        create: {
          paymentNo: `SIM-PAY-${suffix}`,
          mode: PaymentMode.SIMULATED,
          status: PaymentStatus.SIMULATED_PENDING,
          currency: "MYR",
          authorizedAmountSen: 5000,
          capturedAmountSen: 0,
          isSimulated: true,
          simulatedLabel: "SIMULATED - NO REAL FUNDS CHARGED",
          events: {
            create: {
              eventType: "SIMULATED_AUTHORIZED",
              amountSen: 5000,
              status: PaymentStatus.SIMULATED_PENDING,
              payload: { note: "SIMULATED - NO REAL FUNDS CHARGED" },
            },
          },
        },
      },
    },
    include: { charger: true, connector: true, payments: true, ocppTransaction: true },
  });

  return order;
}

// ============================================================================
// Internal HTTP Control Server (Port 9001, host 127.0.0.1)
// ============================================================================
function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: any): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

const internalServer = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = (req.url || "/").split("?")[0];

  try {
    if (req.method === "GET" && url === "/internal/status") {
      sendJson(res, 200, {
        ok: true,
        connectedChargers: Array.from(connectedSockets.keys()),
        uptime: process.uptime(),
      });
      return;
    }

    if (req.method === "POST" && url === "/internal/remote-start") {
      const body = await readJsonBody(req);
      const ocppId = String(body.ocppId || "MY-KL-DC-001");
      const connectorId = Number(body.connectorId || 1);
      const idTag = String(body.idTag || generateOrderOcppIdTag());
      const orderId = body.orderId ? String(body.orderId) : undefined;

      const result = await executeRemoteStartForOrder({
        ocppId,
        connectorId,
        idTag,
        orderId,
      });

      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url === "/internal/remote-stop") {
      const body = await readJsonBody(req);
      const ocppId = String(body.ocppId || "MY-KL-DC-001");
      let transactionId = Number(body.transactionId || 0);
      const orderId = body.orderId ? String(body.orderId) : undefined;

      if (!transactionId && orderId) {
        const tx = await prisma.ocppTransaction.findUnique({ where: { orderId } });
        if (tx) transactionId = tx.transactionId;
      }

      if (!transactionId) {
        const activeTx = await prisma.ocppTransaction.findFirst({
          where: { charger: { ocppId }, stoppedAt: null },
          orderBy: { startedAt: "desc" },
        });
        if (activeTx) transactionId = activeTx.transactionId;
      }

      const callRes = await sendCsmsCall(
        ocppId,
        "RemoteStopTransaction",
        { transactionId },
        { orderId: orderId ?? null, transactionId, timeoutMs: 10000 }
      );

      if (orderId) {
        await prisma.chargingOrder
          .update({
            where: { id: orderId },
            data: { remoteStopSentAt: new Date() },
          })
          .catch(() => {});
      }

      sendJson(res, 200, {
        ok: true,
        status: String(callRes?.status || "Accepted"),
        transactionId,
      });
      return;
    }

    if (req.method === "POST" && url === "/internal/reset") {
      const body = await readJsonBody(req);
      const ocppId = String(body.ocppId || "MY-KL-DC-001");
      const type = body.type === "Hard" ? "Hard" : "Soft";

      const callRes = await sendCsmsCall(ocppId, "Reset", { type }, { timeoutMs: 10000 });
      sendJson(res, 200, {
        ok: true,
        status: String(callRes?.status || "Accepted"),
      });
      return;
    }

    if (req.method === "POST" && url === "/internal/simulator/scenario") {
      const body = await readJsonBody(req);
      const scenario = String(body.scenario || "normal") as
        | "normal"
        | "gbt-real"
        | "reject"
        | "dup-stop"
        | "plug"
        | "unplug";
      const ocppId = String(
        body.ocppId || (scenario === "gbt-real" ? "MY-KL-DC-001" : "MY-KL-DC-001")
      );
      const waitForCompletion = Boolean(body.wait ?? false);

      let sim = embeddedSimulators.get(ocppId);
      if (!sim) {
        const profile = DEMO_CHARGER_PROFILES[ocppId] || DEMO_CHARGER_PROFILES["MY-KL-DC-001"];
        sim = new ChargerSimulator(profile, {
          wsBaseUrl: `ws://127.0.0.1:${OCPP_PORT}/ocpp`,
        });
        embeddedSimulators.set(ocppId, sim);
      }
      await sim.connect();

      if (scenario === "plug") {
        await sim.simulatePlugIn();
        sendJson(res, 200, { ok: true, scenario, ocppId, status: "Preparing" });
        return;
      }

      if (scenario === "unplug") {
        await sim.simulateUnplug();
        sendJson(res, 200, { ok: true, scenario, ocppId, status: "Available" });
        return;
      }

      const order = await createOrLoadScenarioOrder(ocppId, body.orderId);

      if (scenario === "reject") {
        sim.rejectNextStart = true;
        const rejectRes = await executeRemoteStartForOrder({
          ocppId,
          connectorId: 1,
          idTag: order.ocppIdTag,
          orderId: order.id,
        });

        const updatedOrder = await prisma.chargingOrder.findUnique({
          where: { id: order.id },
          include: { payments: true, events: true },
        });

        sendJson(res, 200, {
          ok: true,
          scenario,
          ocppId,
          remoteStartResult: rejectRes,
          orderId: order.id,
          orderNo: order.orderNo,
          orderStatus: updatedOrder?.status,
          paymentStatuses: updatedOrder?.payments.map((p) => p.status),
        });
        return;
      }

      // Configure simulator for normal, gbt-real, or dup-stop
      sim.rejectNextStart = false;
      sim.isGbtRealProfile = scenario === "gbt-real" || ocppId === "MY-KL-DC-001";
      sim.autoStopAfterTicks = Number(body.ticks || 4);
      sim.duplicateNextStop = scenario === "dup-stop";

      const startRes = await executeRemoteStartForOrder({
        ocppId,
        connectorId: 1,
        idTag: order.ocppIdTag,
        orderId: order.id,
      });

      if (waitForCompletion) {
        // Wait until order reaches COMPLETED (approx 3s handshake + 4*2s ticks + 1s stop = ~12.5s)
        const deadline = Date.now() + 22000;
        while (Date.now() < deadline) {
          const check = await prisma.chargingOrder.findUnique({
            where: { id: order.id },
            include: { payments: true, ocppTransaction: true, events: true },
          });
          if (
            check &&
            (check.status === OrderStatus.COMPLETED ||
              check.status === OrderStatus.START_FAILED ||
              check.status === OrderStatus.MANUAL_REVIEW)
          ) {
            // If dup-stop, wait briefly so second duplicate StopTransaction is also processed
            if (scenario === "dup-stop" && !check.ocppTransaction?.isDuplicateStopSeen) {
              await new Promise((r) => setTimeout(r, 600));
              continue;
            }
            sendJson(res, 200, {
              ok: true,
              scenario,
              ocppId,
              orderId: check.id,
              orderNo: check.orderNo,
              orderStatus: check.status,
              chargedEnergyWh: check.chargedEnergyWh,
              totalAmountSen: check.totalAmountSen,
              lastValidSocPercent: check.lastValidSocPercent,
              isDuplicateStopSeen: check.ocppTransaction?.isDuplicateStopSeen ?? false,
              paymentCount: check.payments.length,
              paymentStatuses: check.payments.map((p) => p.status),
            });
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      sendJson(res, 200, {
        ok: true,
        scenario,
        ocppId,
        remoteStartResult: startRes,
        orderId: order.id,
        orderNo: order.orderNo,
      });
      return;
    }

    sendJson(res, 404, { ok: false, error: `Unknown endpoint ${req.method} ${url}` });
  } catch (err: any) {
    console.error(`[Internal HTTP] Error on ${req.method} ${url}:`, err);
    sendJson(res, 500, { ok: false, error: err?.message || "Internal server error" });
  }
});

export async function startOcppGateway(): Promise<void> {
  await new Promise<void>((resolve) => {
    wsHttpServer.listen(OCPP_PORT, "0.0.0.0", () => {
      console.log(`[OCPP 1.6J Gateway] WebSocket Server listening on ws://127.0.0.1:${OCPP_PORT}/ocpp/:ocppId`);
      resolve();
    });
  });

  await new Promise<void>((resolve) => {
    internalServer.listen(OCPP_INTERNAL_PORT, "127.0.0.1", () => {
      console.log(
        `[OCPP 1.6J Gateway] Internal Control HTTP Server listening on http://127.0.0.1:${OCPP_INTERNAL_PORT}`
      );
      resolve();
    });
  });

  await bootEmbeddedSimulators(OCPP_PORT);
}

if (require.main === module) {
  startOcppGateway().catch((err) => {
    console.error("[OCPP 1.6J Gateway] Fatal startup error:", err);
    process.exit(1);
  });
}
