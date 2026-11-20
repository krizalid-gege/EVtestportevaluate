process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/ev_cpo_dev?schema=public";

import http from "node:http";

type ScenarioType = "normal" | "gbt-real" | "reject" | "dup-stop" | "plug" | "unplug";

function parseArgs(): { scenario: ScenarioType; ocppId?: string } {
  const args = process.argv.slice(2);
  let scenario: ScenarioType = "normal";
  let ocppId: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--scenario=")) {
      const val = arg.split("=")[1] as ScenarioType;
      if (["normal", "gbt-real", "reject", "dup-stop", "plug", "unplug"].includes(val)) {
        scenario = val;
      }
    } else if (arg.startsWith("--ocppId=")) {
      ocppId = arg.split("=")[1];
    }
  }

  return { scenario, ocppId };
}

function postJson(url: string, body: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const payload = JSON.stringify(body);

    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({ raw });
          }
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function getJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(`Invalid JSON from ${url}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const { scenario, ocppId } = parseArgs();
  const internalPort = Number(process.env.OCPP_INTERNAL_PORT || 9001);
  const baseUrl = `http://127.0.0.1:${internalPort}`;

  let gatewayAlreadyRunning = false;
  try {
    const status = await getJson(`${baseUrl}/internal/status`);
    if (status?.ok) {
      gatewayAlreadyRunning = true;
    }
  } catch {
    gatewayAlreadyRunning = false;
  }

  if (!gatewayAlreadyRunning) {
    console.log("[Simulator CLI] OCPP Gateway not detected on port 9001; starting embedded gateway...");
    const { startOcppGateway } = await import("../server");
    await startOcppGateway();
  }

  const targetOcppId = ocppId || (scenario === "gbt-real" ? "MY-KL-DC-001" : "MY-KL-DC-001");
  console.log(
    `[Simulator CLI] Running scenario="${scenario}" on charger="${targetOcppId}" (Techone GPEV20 + QuanYao QY-SECC-02)...`
  );

  const result = await postJson(`${baseUrl}/internal/simulator/scenario`, {
    scenario,
    ocppId: targetOcppId,
    ticks: 4,
    wait: true,
  });

  console.log("[Simulator CLI] Scenario Result:");
  console.log(JSON.stringify(result, null, 2));

  if (!result?.ok) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[Simulator CLI] Fatal error:", err);
  process.exit(1);
});
