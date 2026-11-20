/**
 * QuanYao (全耀) SECC & Techone GPEV20-BG102-S1P-EA Telemetry Sanitizer & Diagnostic Decoder
 * Based on INFOSECC/桩端国标转CCS通信协议.xls & SECC与充电桩控制板通信协议规范.pdf
 */

export const QUANYAO_V2G_SEQUENCE_STEPS: Record<number, string> = {
  0x01: "SECC Init",
  0x02: "Run V2G Stack",
  0x03: "SLAC Attenuation Matching",
  0x04: "SDP Request",
  0x05: "SDP Response",
  0x06: "AppProtocol Handshake Req",
  0x07: "AppProtocol Handshake Res",
  0x08: "SessionSetup Req",
  0x09: "SessionSetup Res",
  0x0a: "ServiceDiscovery Req",
  0x0b: "ServiceDiscovery Res",
  0x0c: "PaymentServiceSelection Req",
  0x0d: "PaymentServiceSelection Res",
  0x0e: "ContractAuthentication Req",
  0x0f: "ContractAuthentication Res",
  0x10: "ChargeParameterDiscovery Req (BCP)",
  0x11: "ChargeParameterDiscovery Res (CML)",
  0x12: "CableCheck Req (BRO=0xAA / 30s IMD Insulation Test)",
  0x13: "CableCheck Res (CRO=0xAA)",
  0x14: "PreCharge Req (BCL PreCharge=1)",
  0x15: "PreCharge Res (Voltage Ramp)",
  0x16: "PowerDelivery(Start) Req",
  0x17: "PowerDelivery(Start) Res",
  0x18: "CurrentDemand Req (Active Charging)",
  0x19: "CurrentDemand Res (Active Charging)",
  0x1a: "PowerDelivery(Stop) Req",
  0x1b: "PowerDelivery(Stop) Res",
  0x1c: "WeldingDetection Req (BSD)",
  0x1d: "WeldingDetection Res (CSD)",
  0x1e: "SessionStop Req",
  0x1f: "SessionStop Res",
  0x30: "SECC Restart",
};

export const QUANYAO_PLC_ERROR_CODES: Record<number, string> = {
  0x01: "GQ_SIG_ERROR_CP_PP (CP/PP Signal Error)",
  0x22: "GQ_SLAC_TIMER_TIMEOUT",
  0x26: "GQ_SLAC_START_ATTEN_CHAR_TIMEOUT",
  0x28: "GQ_SLAC_ATTEN_CHAR_TIMEOUT",
  0x2f: "GQ_SLAC_MATCH_TIMEOUT (SLAC Matching Timeout)",
  0x33: "GQ_SLAC_LINK_DETECT_ERROR",
  0x47: "GQ_SDP_TIMEOUT (SDP Discovery Timeout)",
  0x57: "GQ_DIN_V2G_TIMEOUT (V2G Message Timeout)",
  0x5a: "GQ_DIN_DECODE_EXI_ERROR",
  0x60: "GQ_DIN_NO_PROTOCOL (EV Protocol Incompatible)",
  0x70: "GQ_CHM_OR_EVSE_SHUTDOWN_TIMEOUT",
  0x80: "GQ_V2G_FAILED_RESPONSE",
  0x84: "GQ_SUDDEN_STOP_BY_SECC",
  0x87: "GQ_STOP_BY_EV",
  0x90: "GQ_V2G_COMM_PORT_MAY_LOST",
  0xa2: "GQ_DETECT_PP_UNPLUG",
  0xa3: "GQ_DETECT_CP_STATE_A (12V Unplugged)",
  0xa4: "GQ_DETECT_CP_STATE_B (9V Unexpected Drop from State C)",
  0xb0: "GQ_CAN_LOSS (Charger Controller CAN Loss)",
  0xb1: "GQ_CRMAA_TIMEOUT",
  0xb3: "GQ_CTSCML_TIMEOUT",
  0xb4: "GQ_CROAA_TIMEOUT (Charger 30s Insulation Test Timeout)",
  0xb6: "GQ_CCS_TIMEOUT",
  0xe0: "GQ_STOP_BY_EV",
  0xe1: "GQ_ISO_PAUSE_BY_EV",
  0xe4: "GQ_EMERGENCY_STOP_BY_SECC",
  0xe5: "GQ_STOP_BY_CHARGER",
};

export const CCS_EV_ERROR_CODES: Record<number, string> = {
  0x00: "NO_ERROR",
  0x01: "FAILED_RESSTemperatureInhibit (EV Battery Temp Inhibit)",
  0x02: "FAILED_EVShiftPosition (Vehicle Not in Park)",
  0x03: "FAILED_ChargerConnectorLockFault (EV Connector Lock Fault)",
  0x04: "FAILED_EVRESSMalfunction (EV BMS Malfunction)",
  0x05: "FAILED_ChargingCurrentdifferential (Current Mismatch)",
  0x06: "FAILED_ChargingVoltageOutOfRange (Voltage Out of Range)",
  0x0a: "FAILED_ChargingSystemIncompatibility",
  0x10: "FAILED_ChargingSystemIncompatibility",
  0x14: "NormalStopRequestBeforeCharging_by_EVCC",
  0x15: "EV_Timeout_CAN_Data",
};

/**
 * Decodes vendorErrorCode / info string reported by Techone GPEV20 + QuanYao SECC
 */
export function decodeSeccVendorDiagnostic(
  vendorErrorCode?: string | null,
  info?: string | null
): string | null {
  if (!vendorErrorCode && !info) return null;
  const combined = `${vendorErrorCode || ""} ${info || ""}`.trim();
  const hexMatch = combined.match(/0x([0-9a-fA-F]{2})/i);
  if (hexMatch) {
    const code = parseInt(hexMatch[1], 16);
    if (QUANYAO_PLC_ERROR_CODES[code]) {
      return `${combined} -> ${QUANYAO_PLC_ERROR_CODES[code]}`;
    }
    if (QUANYAO_V2G_SEQUENCE_STEPS[code]) {
      return `${combined} -> ${QUANYAO_V2G_SEQUENCE_STEPS[code]}`;
    }
  }
  return combined;
}

/**
 * Sanitizes OCPP 1.6J MeterValues sampledValue array according to QuanYao SECC quirks:
 * 1. Energy.Active.Import.Register: converts kWh to integer Wh.
 * 2. SoC: ignores 0% reported during handshake (BCP) or stop (BSD) so lastValidSocPercent is preserved.
 * 3. Temperature: filters out bogus -50°C values caused by unpopulated 0x00 BMS cell temperature bytes in GB/T-to-CCS translation.
 */
export interface SanitizedMeterSample {
  energyRegisterWh: number | null;
  powerW: number | null;
  voltageV: number | null;
  currentA: number | null;
  socPercent: number | null;
  temperatureC: number | null;
}

export function parseAndSanitizeOcppSampledValues(
  sampledValues: Array<{
    value: string;
    measurand?: string;
    unit?: string;
    context?: string;
  }>,
  previousValidSocPercent?: number | null
): SanitizedMeterSample {
  let energyRegisterWh: number | null = null;
  let powerW: number | null = null;
  let voltageV: number | null = null;
  let currentA: number | null = null;
  let socPercent: number | null = previousValidSocPercent ?? null;
  let temperatureC: number | null = null;

  for (const item of sampledValues || []) {
    const rawNum = Number(item.value);
    if (Number.isNaN(rawNum)) continue;
    const measurand = item.measurand || "Energy.Active.Import.Register";
    const unit = (item.unit || "").toLowerCase();

    if (measurand === "Energy.Active.Import.Register") {
      if (unit === "kwh") {
        energyRegisterWh = Math.round(rawNum * 1000);
      } else {
        energyRegisterWh = Math.round(rawNum);
      }
    } else if (measurand === "Power.Active.Import") {
      if (unit === "kw") {
        powerW = Math.round(rawNum * 1000);
      } else {
        powerW = Math.round(rawNum);
      }
    } else if (measurand === "Voltage") {
      if (rawNum > 0) {
        voltageV = Math.round(rawNum * 10) / 10;
      }
    } else if (measurand === "Current.Import") {
      if (rawNum >= 0) {
        currentA = Math.round(rawNum * 10) / 10;
      }
    } else if (measurand === "SoC") {
      const roundedSoc = Math.round(rawNum);
      // Quirk protection: QuanYao SECC hardcodes 0% in BCP (handshake) and BSD (stop).
      // Only update if > 0 and <= 100, OR if there was no previous valid SoC and rawNum > 0.
      if (roundedSoc > 0 && roundedSoc <= 100) {
        socPercent = roundedSoc;
      }
    } else if (measurand === "Temperature") {
      // Quirk protection: Unpopulated BMS cell temp 0x00 with -50C offset produces -50C.
      // Only accept physical temperatures above -40C and below 150C.
      if (rawNum > -40 && rawNum < 150) {
        temperatureC = Math.round(rawNum * 10) / 10;
      }
    }
  }

  return {
    energyRegisterWh,
    powerW,
    voltageV,
    currentA,
    socPercent,
    temperatureC,
  };
}
