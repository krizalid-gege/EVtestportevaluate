import { NextResponse } from "next/server";
import { prisma } from "@ev-cpo/db";
import { getCurrentUser, handleApiError } from "@/lib/auth";
import { triggerOcppSimulatorScenario } from "@/lib/ocpp-client";

function normalizeScenarioName(rawScenario: string): string {
  const s = rawScenario.trim();
  const upper = s.toUpperCase();
  if (upper === "SCENARIO_1_STANDARD_LOOP" || s === "normal") {
    return "normal";
  }
  if (upper === "SCENARIO_2_GBT_20KW_REAL_PROFILE" || s === "gbt-real") {
    return "gbt-real";
  }
  if (upper === "SCENARIO_3_REMOTE_START_REJECTED" || s === "reject") {
    return "reject";
  }
  if (upper === "SCENARIO_4_DUPLICATE_STOP_IDEMPOTENCY" || s === "dup-stop") {
    return "dup-stop";
  }
  return s;
}

/**
 * Triggers built-in OCPP 1.6J simulator scenarios (`normal`, `gbt-real`, `reject`, `dup-stop`, `plug`, `unplug`)
 * via the OCPP Gateway internal API so Phase 1A acceptance criteria can be verified from browser or CLI.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json().catch(() => ({}));

    const rawScenario = String(body.scenario || "normal").trim();
    const scenario = normalizeScenarioName(rawScenario);
    const ocppId = String(body.ocppId || "MY-KL-DC-001").trim();

    // Wait for completion by default unless explicitly set to false
    const shouldWait =
      body.wait !== undefined
        ? Boolean(body.wait)
        : !["plug", "unplug"].includes(scenario);

    const ticks =
      body.ticks !== undefined
        ? Number(body.ticks)
        : body.autoStopAfterTicks !== undefined
        ? Number(body.autoStopAfterTicks)
        : 3;

    const result = await triggerOcppSimulatorScenario({
      ocppId,
      scenario,
      idTag: body.idTag ? String(body.idTag) : undefined,
      orderId: body.orderId ? String(body.orderId) : undefined,
      wait: shouldWait,
      ticks,
      autoStopAfterTicks: ticks,
    });

    let orderDetail = null;
    if (result?.orderId) {
      orderDetail = await prisma.chargingOrder.findUnique({
        where: { id: String(result.orderId) },
        include: {
          tariffSnapshot: true,
          payments: true,
          ocppTransaction: true,
          events: { orderBy: { createdAt: "asc" } },
        },
      });
    }

    return NextResponse.json({
      ...result,
      ok: Boolean(result?.ok ?? true),
      triggeredBy: user?.email || "demo-evaluator",
      ocppId,
      scenario,
      rawScenario,
      order: orderDetail,
      result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
