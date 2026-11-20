import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateOrderBilling,
  formatMyrFromSen,
  formatKwhFromWh,
} from "../billing";
import {
  generateOrderOcppIdTag,
  classifyOcppIdTag,
} from "../idtag";
import {
  parseAndSanitizeOcppSampledValues,
  decodeSeccVendorDiagnostic,
} from "../secc";

describe("Core Integer Billing & Currency Engine (REQ-BIL-001 ~ 005)", () => {
  const demoTariffTaxInclusive = {
    energyPriceSenPerKwh: 120, // RM 1.20/kWh
    serviceFeeSenPerKwh: 30,   // RM 0.30/kWh
    taxRateBps: 600,           // 6.00% SST
    isTaxInclusive: true,
    currency: "MYR",
  };

  it("calculates exact integer Sen amounts for 10,000 Wh (10.000 kWh) tax-inclusive", () => {
    const result = calculateOrderBilling(10000, demoTariffTaxInclusive);
    assert.equal(result.chargedEnergyWh, 10000);
    assert.equal(result.energyAmountSen, 1200); // RM 12.00
    assert.equal(result.serviceAmountSen, 300); // RM 3.00
    assert.equal(result.totalAmountSen, 1500);  // RM 15.00
    // Tax backed out: round(1500 * 600 / 10600) = round(84.9056) = 85 Sen
    assert.equal(result.taxAmountSen, 85);
    assert.equal(result.subtotalAmountSen, 1415);
    assert.equal(result.subtotalAmountSen + result.taxAmountSen, result.totalAmountSen);
    assert.equal(result.currency, "MYR");
  });

  it("handles zero and negative energy safely without negative billing", () => {
    const zeroResult = calculateOrderBilling(0, demoTariffTaxInclusive);
    assert.equal(zeroResult.chargedEnergyWh, 0);
    assert.equal(zeroResult.energyAmountSen, 0);
    assert.equal(zeroResult.serviceAmountSen, 0);
    assert.equal(zeroResult.subtotalAmountSen, 0);
    assert.equal(zeroResult.taxAmountSen, 0);
    assert.equal(zeroResult.totalAmountSen, 0);

    const negResult = calculateOrderBilling(-450, demoTariffTaxInclusive);
    assert.equal(negResult.chargedEnergyWh, 0);
    assert.equal(negResult.totalAmountSen, 0);
  });

  it("calculates fractional Wh with half-up integer rounding and tax-exclusive mode", () => {
    const taxExclusiveTariff = {
      energyPriceSenPerKwh: 120,
      serviceFeeSenPerKwh: 30,
      taxRateBps: 600,
      isTaxInclusive: false,
      currency: "MYR",
    };
    // 15,432 Wh = 15.432 kWh
    // Energy: floor((15432 * 120 + 500) / 1000) = floor(1852340 / 1000) = 1852 Sen
    // Service: floor((15432 * 30 + 500) / 1000) = floor(463460 / 1000) = 463 Sen
    // Subtotal: 1852 + 463 = 2315 Sen
    // Tax: floor((2315 * 600 + 5000) / 10000) = floor(1394000 / 10000) = 139 Sen
    // Total: 2315 + 139 = 2454 Sen
    const result = calculateOrderBilling(15432, taxExclusiveTariff);
    assert.equal(result.chargedEnergyWh, 15432);
    assert.equal(result.energyAmountSen, 1852);
    assert.equal(result.serviceAmountSen, 463);
    assert.equal(result.subtotalAmountSen, 2315);
    assert.equal(result.taxAmountSen, 139);
    assert.equal(result.totalAmountSen, 2454);
  });

  it("formats MYR Sen and kWh from Wh accurately", () => {
    assert.equal(formatMyrFromSen(1525), "RM 15.25");
    assert.equal(formatMyrFromSen(5), "RM 0.05");
    assert.equal(formatMyrFromSen(0), "RM 0.00");
    assert.equal(formatMyrFromSen(1525, false), "15.25");
    assert.equal(formatMyrFromSen(-350), "-RM 3.50");

    assert.equal(formatKwhFromWh(15432), "15.432 kWh");
    assert.equal(formatKwhFromWh(50), "0.050 kWh");
    assert.equal(formatKwhFromWh(1000, false), "1.000");
  });
});

describe("OCPP 1.6J idTag Generator & Classifier", () => {
  it("generates OCPP 1.6J compliant order idTags (<= 20 chars, ord_ prefix)", () => {
    for (let i = 0; i < 20; i++) {
      const tag = generateOrderOcppIdTag();
      assert.ok(tag.startsWith("ord_"));
      assert.equal(tag.length, 16);
      assert.ok(tag.length <= 20);
      const classification = classifyOcppIdTag(tag);
      assert.equal(classification.valid, true);
      assert.equal(classification.type, "ORDER_TOKEN");
      assert.equal(classification.normalized, tag);
    }
  });

  it("classifies ORDER_TOKEN, EVCC_MAC_AUTOCHARGE, ISO15118_EMAID, RFID_OR_CUSTOM, and INVALID idTags", () => {
    const orderTag = classifyOcppIdTag("ord_a8f9k2m1p4x7");
    assert.equal(orderTag.valid, true);
    assert.equal(orderTag.type, "ORDER_TOKEN");

    const macTag = classifyOcppIdTag("001a2b3c4d5e");
    assert.equal(macTag.valid, true);
    assert.equal(macTag.type, "EVCC_MAC_AUTOCHARGE");
    assert.equal(macTag.normalized, "001A2B3C4D5E");

    const vidMacTag = classifyOcppIdTag("VID:aabbccddeeff");
    assert.equal(vidMacTag.valid, true);
    assert.equal(vidMacTag.type, "EVCC_MAC_AUTOCHARGE");
    assert.equal(vidMacTag.normalized, "VID:AABBCCDDEEFF");

    const emaidTag = classifyOcppIdTag("MY-CPO-C12345678-9");
    assert.equal(emaidTag.valid, true);
    assert.equal(emaidTag.type, "ISO15118_EMAID");

    const rfidTag = classifyOcppIdTag("RFID_CARD_01");
    assert.equal(rfidTag.valid, true);
    assert.equal(rfidTag.type, "RFID_OR_CUSTOM");

    const tooLong = classifyOcppIdTag("ord_123456789012345678901");
    assert.equal(tooLong.valid, false);
    assert.equal(tooLong.type, "INVALID");

    const empty = classifyOcppIdTag("   ");
    assert.equal(empty.valid, false);
    assert.equal(empty.type, "INVALID");
  });
});

describe("QuanYao SECC & Techone GPEV20 Telemetry Sanitizer & Diagnostic Decoder", () => {
  it("preserves lastValidSocPercent when trailing 0% SoC arrives during BCP/BSD", () => {
    // Active charging sample with 68% SoC and 12.5 kWh
    const activeSample = parseAndSanitizeOcppSampledValues(
      [
        { measurand: "Energy.Active.Import.Register", value: "12.5", unit: "kWh" },
        { measurand: "Power.Active.Import", value: "19.8", unit: "kW" },
        { measurand: "Voltage", value: "395.4", unit: "V" },
        { measurand: "Current.Import", value: "50.1", unit: "A" },
        { measurand: "SoC", value: "68", unit: "Percent" },
        { measurand: "Temperature", value: "34.2", unit: "Celsius" },
      ],
      65
    );

    assert.equal(activeSample.energyRegisterWh, 12500);
    assert.equal(activeSample.powerW, 19800);
    assert.equal(activeSample.voltageV, 395.4);
    assert.equal(activeSample.currentA, 50.1);
    assert.equal(activeSample.socPercent, 68);
    assert.equal(activeSample.temperatureC, 34.2);

    // Stop / BSD sample where QuanYao SECC sends trailing 0% SoC
    const stopSample = parseAndSanitizeOcppSampledValues(
      [
        { measurand: "Energy.Active.Import.Register", value: "12850", unit: "Wh" },
        { measurand: "Power.Active.Import", value: "0", unit: "W" },
        { measurand: "SoC", value: "0", unit: "Percent" },
      ],
      activeSample.socPercent
    );

    assert.equal(stopSample.energyRegisterWh, 12850);
    assert.equal(stopSample.powerW, 0);
    // Must preserve 68% instead of overwriting with 0%
    assert.equal(stopSample.socPercent, 68);
  });

  it("rejects bogus -50°C BMS cell temperature offset caused by unpopulated 0x00 bytes", () => {
    const sampleWithBogusTemp = parseAndSanitizeOcppSampledValues(
      [
        { measurand: "Energy.Active.Import.Register", value: "5000", unit: "Wh" },
        { measurand: "Temperature", value: "-50", unit: "Celsius" },
      ],
      42
    );

    assert.equal(sampleWithBogusTemp.energyRegisterWh, 5000);
    assert.equal(sampleWithBogusTemp.socPercent, 42);
    assert.equal(sampleWithBogusTemp.temperatureC, null);
  });

  it("decodes QuanYao SECC PLC error codes and V2G sequence steps", () => {
    const slacTimeout = decodeSeccVendorDiagnostic("0x2F", "PLC fault");
    assert.ok(slacTimeout?.includes("GQ_SLAC_MATCH_TIMEOUT"));

    const croTimeout = decodeSeccVendorDiagnostic("ERR_0xB4", null);
    assert.ok(croTimeout?.includes("GQ_CROAA_TIMEOUT"));

    const cableCheckStep = decodeSeccVendorDiagnostic(null, "Step 0x12 active");
    assert.ok(cableCheckStep?.includes("CableCheck Req"));

    assert.equal(decodeSeccVendorDiagnostic(null, null), null);
  });
});
