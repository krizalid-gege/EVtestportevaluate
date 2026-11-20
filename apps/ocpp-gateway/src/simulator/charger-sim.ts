import WebSocket from "ws";

export interface ChargerProfile {
  ocppId: string;
  vendor: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  seccModel: string;
  standard: "GBT_DC" | "CCS2";
}

export const DEMO_CHARGER_PROFILES: Record<string, ChargerProfile> = {
  "MY-KL-DC-001": {
    ocppId: "MY-KL-DC-001",
    vendor: "Techone",
    model: "GPEV20-BG102-S1P-EA",
    serialNumber: "T1-GPEV20-2026-0001",
    firmwareVersion: "V2.14.8-QY-SECC02-GBT",
    seccModel: "QY-SECC-02",
    standard: "GBT_DC",
  },
  "MY-KL-DC-002": {
    ocppId: "MY-KL-DC-002",
    vendor: "Techone",
    model: "GPEV20-BG102-S1P-EA",
    serialNumber: "T1-GPEV20-2026-0002",
    firmwareVersion: "V2.14.8-QY-SECC02-CCS2",
    seccModel: "QY-SECC-02",
    standard: "CCS2",
  },
};

export interface SimulatorOptions {
  wsBaseUrl?: string;
  autoStopAfterTicks?: number | null; // If set, automatically stops after N MeterValues ticks
  duplicateStopOnAuto?: boolean;
  isGbtRealProfile?: boolean;
}

export class ChargerSimulator {
  public readonly profile: ChargerProfile;
  private wsBaseUrl: string;
  private ws: WebSocket | null = null;
  private msgCounter = 1;
  private pendingCalls = new Map<
    string,
    { resolve: (payload: any) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }
  >();

  public rejectNextStart = false;
  public duplicateNextStop = false;
  public isGbtRealProfile = false;
  public autoStopAfterTicks: number | null = null;

  private activeTransactionId: number | null = null;
  private activeIdTag: string | null = null;
  private currentMeterWh = 100000;
  private currentSoc = 45;
  private tickCount = 0;
  private meterInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private progressionTimers: NodeJS.Timeout[] = [];
  private isStopping = false;

  constructor(profile: ChargerProfile, options: SimulatorOptions = {}) {
    this.profile = profile;
    this.wsBaseUrl = options.wsBaseUrl || `ws://127.0.0.1:${process.env.OCPP_PORT || 9000}/ocpp`;
    this.autoStopAfterTicks = options.autoStopAfterTicks ?? null;
    this.duplicateNextStop = options.duplicateStopOnAuto ?? false;
    this.isGbtRealProfile = options.isGbtRealProfile ?? profile.standard === "GBT_DC";
  }

  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `${this.wsBaseUrl.replace(/\/$/, "")}/${this.profile.ocppId}`;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url, ["ocpp1.6"]);
      this.ws = socket;

      const connectTimeout = setTimeout(() => {
        reject(new Error(`Timeout connecting simulator ${this.profile.ocppId} to ${url}`));
      }, 8000);

      socket.on("open", async () => {
        clearTimeout(connectTimeout);
        try {
          await this.sendBootSequence();
          this.startHeartbeat(30000);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      socket.on("message", (raw) => {
        this.handleIncomingMessage(raw.toString());
      });

      socket.on("close", () => {
        this.clearTimers();
      });

      socket.on("error", (err) => {
        clearTimeout(connectTimeout);
        console.error(`[Sim ${this.profile.ocppId}] WebSocket error:`, err.message);
      });
    });
  }

  public disconnect(): void {
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private clearTimers(): void {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const t of this.progressionTimers) {
      clearTimeout(t);
    }
    this.progressionTimers = [];
  }

  private startHeartbeat(intervalMs: number): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendCall("Heartbeat", {}).catch(() => {});
      }
    }, intervalMs);
  }

  public async sendBootSequence(): Promise<void> {
    await this.sendCall("BootNotification", {
      chargePointVendor: this.profile.vendor,
      chargePointModel: this.profile.model,
      chargePointSerialNumber: this.profile.serialNumber,
      firmwareVersion: this.profile.firmwareVersion,
      iccid: "8960110000002026",
      imsi: "502120000002026",
    });

    // Connector 0 controller status
    await this.sendCall("StatusNotification", {
      connectorId: 0,
      errorCode: "NoError",
      status: "Available",
      info: "0x02 Run V2G Stack Ready",
      vendorId: "Techone-QuanYao",
      vendorErrorCode: "0x02",
      timestamp: new Date().toISOString(),
    });

    // Connector 1 Gun plugged in & Preparing for quick demo start
    await this.sendCall("StatusNotification", {
      connectorId: 1,
      errorCode: "NoError",
      status: "Preparing",
      info:
        this.profile.standard === "GBT_DC"
          ? "0x03 SLAC / GB/T 27930 CC1=4V Gun Plugged In (BHM Handshake Ready)"
          : "0x03 SLAC Attenuation Matching Complete (CP=9V State B)",
      vendorId: "Techone-QuanYao",
      vendorErrorCode: "0x03",
      timestamp: new Date().toISOString(),
    });
  }

  public async simulatePlugIn(): Promise<void> {
    await this.sendCall("StatusNotification", {
      connectorId: 1,
      errorCode: "NoError",
      status: "Preparing",
      info: "0x03 SLAC Attenuation Matching (Gun Plugged In)",
      vendorId: "Techone-QuanYao",
      vendorErrorCode: "0x03",
      timestamp: new Date().toISOString(),
    });
  }

  public async simulateUnplug(): Promise<void> {
    await this.sendCall("StatusNotification", {
      connectorId: 1,
      errorCode: "NoError",
      status: "Available",
      info: "0xA3 GQ_DETECT_CP_STATE_A (12V Unplugged)",
      vendorId: "Techone-QuanYao",
      vendorErrorCode: "0xA3",
      timestamp: new Date().toISOString(),
    });
  }

  private handleIncomingMessage(rawText: string): void {
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;

    const [messageTypeId, uniqueId, third, fourth] = parsed;

    if (messageTypeId === 3) {
      // CALLRESULT
      const pending = this.pendingCalls.get(String(uniqueId));
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingCalls.delete(String(uniqueId));
        pending.resolve(third);
      }
    } else if (messageTypeId === 4) {
      // CALLERROR
      const pending = this.pendingCalls.get(String(uniqueId));
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingCalls.delete(String(uniqueId));
        pending.reject(new Error(`OCPP CALLERROR: ${third} - ${fourth}`));
      }
    } else if (messageTypeId === 2) {
      // Inbound CALL from CSMS -> Charger
      const action = String(third);
      const payload = fourth || {};
      this.handleCsmsCall(String(uniqueId), action, payload).catch((err) => {
        console.error(`[Sim ${this.profile.ocppId}] Error handling CSMS CALL ${action}:`, err);
      });
    }
  }

  private async handleCsmsCall(uniqueId: string, action: string, payload: any): Promise<void> {
    if (action === "ChangeConfiguration") {
      this.sendCallResult(uniqueId, { status: "Accepted" });
      return;
    }

    if (action === "Reset") {
      this.sendCallResult(uniqueId, { status: "Accepted" });
      const t = setTimeout(() => {
        this.sendBootSequence().catch(() => {});
      }, 600);
      this.progressionTimers.push(t);
      return;
    }

    if (action === "RemoteStartTransaction") {
      if (this.rejectNextStart) {
        // Consume one-shot reject flag so subsequent normal tests work cleanly
        this.rejectNextStart = false;
        this.sendCallResult(uniqueId, { status: "Rejected" });
        await this.sendCall("StatusNotification", {
          connectorId: 1,
          errorCode: "OtherError",
          status: "Preparing",
          info: "0xB4 GQ_CROAA_TIMEOUT (RemoteStart Rejected by Charger Interlock)",
          vendorId: "Techone-QuanYao",
          vendorErrorCode: "0xB4",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const idTag = String(payload.idTag || "ord_demo_tag");
      this.sendCallResult(uniqueId, { status: "Accepted" });
      this.startChargingProgression(idTag);
      return;
    }

    if (action === "RemoteStopTransaction") {
      this.sendCallResult(uniqueId, { status: "Accepted" });
      const t = setTimeout(() => {
        this.executeStopTransaction("Remote").catch((err) => {
          console.error(`[Sim ${this.profile.ocppId}] StopTransaction failed:`, err);
        });
      }, 400);
      this.progressionTimers.push(t);
      return;
    }

    if (action === "TriggerMessage") {
      this.sendCallResult(uniqueId, { status: "Accepted" });
      return;
    }

    // Default reply
    this.sendCallResult(uniqueId, { status: "Accepted" });
  }

  public startChargingProgression(idTag: string): void {
    this.clearProgressionOnly();
    this.activeIdTag = idTag;
    this.isStopping = false;

    // Step 1: Immediate 0x12 CableCheck (IMD Insulation Test)
    this.sendCall("StatusNotification", {
      connectorId: 1,
      errorCode: "NoError",
      status: "Preparing",
      info: "0x12 CableCheck (IMD Insulation Test)",
      vendorId: "Techone-QuanYao",
      vendorErrorCode: "0x12",
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    // Step 2: After 1.5s -> 0x14 PreCharge (412.5V)
    const t1 = setTimeout(() => {
      this.sendCall("StatusNotification", {
        connectorId: 1,
        errorCode: "NoError",
        status: "Preparing",
        info: "0x14 PreCharge (412.5V)",
        vendorId: "Techone-QuanYao",
        vendorErrorCode: "0x14",
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }, 1500);
    this.progressionTimers.push(t1);

    // Step 3: After 3.0s -> StartTransaction + StatusNotification(Charging) + MeterValues every 2s
    const t2 = setTimeout(async () => {
      try {
        this.currentMeterWh = 100000;
        this.currentSoc = this.isGbtRealProfile ? 42 : 45;
        this.tickCount = 0;

        const startRes = await this.sendCall("StartTransaction", {
          connectorId: 1,
          idTag,
          meterStart: this.currentMeterWh,
          timestamp: new Date().toISOString(),
        });

        this.activeTransactionId = Number(startRes?.transactionId) || 1;

        await this.sendCall("StatusNotification", {
          connectorId: 1,
          errorCode: "NoError",
          status: "Charging",
          info: "0x18 CurrentDemand 20kW",
          vendorId: "Techone-QuanYao",
          vendorErrorCode: "0x18",
          timestamp: new Date().toISOString(),
        });

        // Start emitting MeterValues every 2 seconds
        this.meterInterval = setInterval(() => {
          this.emitMeterValueTick().catch((err) => {
            console.error(`[Sim ${this.profile.ocppId}] MeterValues error:`, err);
          });
        }, 2000);
      } catch (err) {
        console.error(`[Sim ${this.profile.ocppId}] Failed in StartTransaction progression:`, err);
      }
    }, 3000);
    this.progressionTimers.push(t2);
  }

  private clearProgressionOnly(): void {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    for (const t of this.progressionTimers) {
      clearTimeout(t);
    }
    this.progressionTimers = [];
  }

  private async emitMeterValueTick(): Promise<void> {
    if (!this.activeTransactionId || this.isStopping) return;

    this.tickCount += 1;
    this.currentMeterWh += 2500; // +2.5 kWh per tick for responsive demo progression
    const socProgression = [45, 52, 60, 68, 75, 82, 88, 94];
    this.currentSoc =
      socProgression[Math.min(this.tickCount - 1, socProgression.length - 1)] ??
      Math.min(99, this.currentSoc + 6);

    const voltage = this.isGbtRealProfile ? "418.6" : "415.2";
    const current = this.isGbtRealProfile ? "46.4" : "46.8";
    const power = "19430";
    // On tick 2, emit a bogus -50°C sample after a valid 36.5°C sample to prove sanitizer filters out -50°C
    const tempValue = this.tickCount === 2 ? "-50.0" : "36.5";

    await this.sendCall("MeterValues", {
      connectorId: 1,
      transactionId: this.activeTransactionId,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: String(this.currentMeterWh),
              measurand: "Energy.Active.Import.Register",
              unit: "Wh",
            },
            {
              value: power,
              measurand: "Power.Active.Import",
              unit: "W",
            },
            {
              value: voltage,
              measurand: "Voltage",
              unit: "V",
            },
            {
              value: current,
              measurand: "Current.Import",
              unit: "A",
            },
            {
              value: String(this.currentSoc),
              measurand: "SoC",
              unit: "Percent",
            },
            {
              value: tempValue,
              measurand: "Temperature",
              unit: "Celsius",
            },
          ],
        },
      ],
    });

    if (this.autoStopAfterTicks !== null && this.tickCount >= this.autoStopAfterTicks) {
      const shouldDup = this.duplicateNextStop;
      this.autoStopAfterTicks = null;
      this.duplicateNextStop = false;
      await this.executeStopTransaction("Local", shouldDup);
    }
  }

  public async executeStopTransaction(
    reason: "Remote" | "Local" | "EVDisconnected" = "Remote",
    sendDuplicateStop = false
  ): Promise<void> {
    if (this.isStopping || !this.activeTransactionId) return;
    this.isStopping = true;
    this.clearProgressionOnly();

    const txId = this.activeTransactionId;
    const idTag = this.activeIdTag || "ord_demo_tag";
    const finalMeterWh = this.currentMeterWh;
    const shouldDuplicate = sendDuplicateStop || this.duplicateNextStop;
    this.duplicateNextStop = false;

    await this.sendCall("StatusNotification", {
      connectorId: 1,
      errorCode: "NoError",
      status: "Finishing",
      info: "0x1C WeldingDetection (BSD) & 0x1E SessionStop",
      vendorId: "Techone-QuanYao",
      vendorErrorCode: "0x1E",
      timestamp: new Date().toISOString(),
    });

    const stopPayload = {
      transactionId: txId,
      idTag,
      meterStop: finalMeterWh,
      timestamp: new Date().toISOString(),
      reason,
      // Include trailing 0% SoC BSD quirk & -50°C unpopulated byte quirk to verify sanitizer preserves lastValidSocPercent
      transactionData: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: String(finalMeterWh),
              measurand: "Energy.Active.Import.Register",
              unit: "Wh",
            },
            {
              value: "0",
              measurand: "SoC",
              unit: "Percent",
            },
            {
              value: "-50",
              measurand: "Temperature",
              unit: "Celsius",
            },
          ],
        },
      ],
    };

    await this.sendCall("StopTransaction", stopPayload);

    if (shouldDuplicate) {
      // Send exact same StopTransaction a second time to verify REQ-CHG-005 / Acceptance Criterion 4 idempotency
      await new Promise((r) => setTimeout(r, 350));
      await this.sendCall("StopTransaction", stopPayload);
    }

    this.activeTransactionId = null;
    this.activeIdTag = null;
    this.isStopping = false;

    await this.sendCall("StatusNotification", {
      connectorId: 1,
      errorCode: "NoError",
      status: "Preparing",
      info: "0x03 Session Ended - Gun Still Plugged In (Ready for Next Session)",
      vendorId: "Techone-QuanYao",
      vendorErrorCode: "0x03",
      timestamp: new Date().toISOString(),
    });
  }

  public sendCall(action: string, payload: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error(`Simulator ${this.profile.ocppId} socket is not open`));
      }
      const uniqueId = `${this.profile.ocppId}-${Date.now()}-${this.msgCounter++}`;
      const timer = setTimeout(() => {
        this.pendingCalls.delete(uniqueId);
        reject(new Error(`Simulator CALL timeout for ${action} (${uniqueId})`));
      }, 10000);

      this.pendingCalls.set(uniqueId, { resolve, reject, timer });
      const frame = JSON.stringify([2, uniqueId, action, payload]);
      this.ws.send(frame);
    });
  }

  private sendCallResult(uniqueId: string, payload: Record<string, any>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const frame = JSON.stringify([3, uniqueId, payload]);
    this.ws.send(frame);
  }
}

// Singleton registry of embedded simulators inside the OCPP Gateway process
export const embeddedSimulators = new Map<string, ChargerSimulator>();

export async function bootEmbeddedSimulators(wsPort: number): Promise<void> {
  const wsBaseUrl = `ws://127.0.0.1:${wsPort}/ocpp`;
  for (const profile of Object.values(DEMO_CHARGER_PROFILES)) {
    let sim = embeddedSimulators.get(profile.ocppId);
    if (!sim) {
      sim = new ChargerSimulator(profile, { wsBaseUrl });
      embeddedSimulators.set(profile.ocppId, sim);
    }
    try {
      await sim.connect();
      console.log(`[Simulator] Connected ${profile.ocppId} (${profile.model} / ${profile.seccModel})`);
    } catch (err: any) {
      console.error(`[Simulator] Failed to connect ${profile.ocppId}:`, err?.message || err);
    }
  }
}
