const OCPP_INTERNAL_HOST = process.env.OCPP_INTERNAL_HOST || "127.0.0.1";
const OCPP_INTERNAL_PORT = process.env.OCPP_INTERNAL_PORT || "9001";
const OCPP_GATEWAY_BASE_URL =
  process.env.OCPP_GATEWAY_HTTP_URL ||
  `http://${OCPP_INTERNAL_HOST}:${OCPP_INTERNAL_PORT}`;
const INTERNAL_SECRET =
  process.env.INTERNAL_SECRET || "ev-cpo-internal-secret-2026-my";

async function callGatewayInternal<T = any>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<T> {
  const url = `${OCPP_GATEWAY_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
        Authorization: `Bearer ${INTERNAL_SECRET}`,
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || data?.message || `Gateway returned HTTP ${res.status}`,
        ...data,
      } as unknown as T;
    }

    return {
      ok: true,
      ...data,
    } as unknown as T;
  } catch (err: any) {
    return {
      ok: false,
      online: false,
      error: err?.message || "Failed to connect to OCPP 1.6J Gateway",
    } as unknown as T;
  } finally {
    clearTimeout(timeout);
  }
}

export interface GatewayStatusResponse {
  ok: boolean;
  online?: boolean;
  wsPort?: number;
  internalPort?: number;
  connectedChargers?: string[];
  uptime?: number;
  simulators?: Array<{
    ocppId: string;
    connected: boolean;
    rejectNextStart?: boolean;
    duplicateNextStop?: boolean;
  }>;
  error?: string;
}

export async function getOcppGatewayStatus(): Promise<GatewayStatusResponse> {
  return callGatewayInternal<GatewayStatusResponse>(
    "/internal/status",
    { method: "GET" },
    5000
  );
}

export interface RemoteStartPayload {
  ocppId: string;
  connectorId: number;
  idTag: string;
  orderId?: string;
}

export interface OcppCommandResult {
  ok: boolean;
  status?: "Accepted" | "Rejected" | string;
  response?: Record<string, any>;
  transactionId?: number;
  error?: string;
}

export async function sendOcppRemoteStart(
  payload: RemoteStartPayload
): Promise<OcppCommandResult> {
  return callGatewayInternal<OcppCommandResult>(
    "/internal/remote-start",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    15000
  );
}

export interface RemoteStopPayload {
  ocppId: string;
  transactionId?: number | null;
  orderId?: string;
}

export async function sendOcppRemoteStop(
  payload: RemoteStopPayload
): Promise<OcppCommandResult> {
  return callGatewayInternal<OcppCommandResult>(
    "/internal/remote-stop",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    15000
  );
}

export interface ResetPayload {
  ocppId: string;
  type?: "Soft" | "Hard";
}

export async function sendOcppReset(
  payload: ResetPayload
): Promise<OcppCommandResult> {
  return callGatewayInternal<OcppCommandResult>(
    "/internal/reset",
    {
      method: "POST",
      body: JSON.stringify({
        ocppId: payload.ocppId,
        type: payload.type || "Soft",
      }),
    },
    15000
  );
}

export interface SimulatorScenarioPayload {
  ocppId?: string;
  scenario:
    | "normal"
    | "gbt-real"
    | "reject"
    | "dup-stop"
    | "plug"
    | "unplug"
    | "boot"
    | "disconnect"
    | "reconnect"
    | string;
  idTag?: string;
  orderId?: string;
  wait?: boolean;
  ticks?: number;
  autoStopAfterTicks?: number;
}

export async function triggerOcppSimulatorScenario(
  payload: SimulatorScenarioPayload
): Promise<Record<string, any>> {
  return callGatewayInternal<Record<string, any>>(
    "/internal/simulator/scenario",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    30000
  );
}
