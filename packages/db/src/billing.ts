/**
 * Core Integer Billing & Currency Engine (REQ-BIL-001 ~ 005)
 * - Energy is always standardized to integer Wh (1 kWh = 1000 Wh).
 * - Money is always stored and computed in integer MYR Sen (1 MYR = 100 Sen).
 * - Binary floating-point arithmetic is strictly prohibited for money calculation.
 */

export interface TariffInput {
  energyPriceSenPerKwh: number; // Integer Sen per kWh, e.g., 120 = RM 1.20/kWh
  serviceFeeSenPerKwh: number;  // Integer Sen per kWh, e.g., 30  = RM 0.30/kWh
  taxRateBps: number;           // Basis points, e.g., 600 = 6.00%
  isTaxInclusive: boolean;      // REQ-BIL-003 / Section 3: User sees tax-inclusive total
  currency?: string;
}

export interface BillingBreakdown {
  chargedEnergyWh: number;
  energyAmountSen: number;
  serviceAmountSen: number;
  subtotalAmountSen: number;
  taxAmountSen: number;
  totalAmountSen: number;
  currency: string;
}

/**
 * Deterministically computes integer Sen amounts from integer Wh and tariff snapshot.
 */
export function calculateOrderBilling(
  chargedEnergyWhInput: number,
  tariff: TariffInput
): BillingBreakdown {
  const chargedEnergyWh = Math.max(0, Math.round(Number(chargedEnergyWhInput) || 0));
  const energyPriceSen = Math.max(0, Math.round(Number(tariff.energyPriceSenPerKwh) || 0));
  const serviceFeeSen = Math.max(0, Math.round(Number(tariff.serviceFeeSenPerKwh) || 0));
  const taxRateBps = Math.max(0, Math.round(Number(tariff.taxRateBps) || 0));

  // Integer math with half-up rounding: round((Wh * SenPerKwh) / 1000)
  const energyAmountSen = Math.floor((chargedEnergyWh * energyPriceSen + 500) / 1000);
  const serviceAmountSen = Math.floor((chargedEnergyWh * serviceFeeSen + 500) / 1000);
  const combinedSen = energyAmountSen + serviceAmountSen;

  let subtotalAmountSen: number;
  let taxAmountSen: number;
  let totalAmountSen: number;

  if (tariff.isTaxInclusive) {
    // Tax-inclusive: User total is energyAmountSen + serviceAmountSen.
    // Back out tax snapshot using integer basis points: tax = round(total * taxRateBps / (10000 + taxRateBps))
    totalAmountSen = combinedSen;
    if (taxRateBps > 0) {
      const denominator = 10000 + taxRateBps;
      taxAmountSen = Math.floor((totalAmountSen * taxRateBps + Math.floor(denominator / 2)) / denominator);
    } else {
      taxAmountSen = 0;
    }
    subtotalAmountSen = totalAmountSen - taxAmountSen;
  } else {
    // Tax-exclusive: Subtotal is energy + service, tax is added on top.
    subtotalAmountSen = combinedSen;
    taxAmountSen = Math.floor((subtotalAmountSen * taxRateBps + 5000) / 10000);
    totalAmountSen = subtotalAmountSen + taxAmountSen;
  }

  return {
    chargedEnergyWh,
    energyAmountSen,
    serviceAmountSen,
    subtotalAmountSen,
    taxAmountSen,
    totalAmountSen,
    currency: tariff.currency || "MYR",
  };
}

/**
 * Formats integer MYR Sen as display string, e.g., 1525 -> "RM 15.25"
 */
export function formatMyrFromSen(sen: number, includeSymbol = true): string {
  const safeSen = Math.round(Number(sen) || 0);
  const isNegative = safeSen < 0;
  const absSen = Math.abs(safeSen);
  const ringgit = Math.floor(absSen / 100);
  const remainderSen = String(absSen % 100).padStart(2, "0");
  const formatted = `${ringgit}.${remainderSen}`;
  const prefix = includeSymbol ? "RM " : "";
  return isNegative ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
}

/**
 * Formats integer Wh as kWh string with 3 decimals, e.g., 15432 -> "15.432 kWh"
 */
export function formatKwhFromWh(wh: number, includeUnit = true): string {
  const safeWh = Math.max(0, Math.round(Number(wh) || 0));
  const kwhWhole = Math.floor(safeWh / 1000);
  const whRemainder = String(safeWh % 1000).padStart(3, "0");
  return includeUnit ? `${kwhWhole}.${whRemainder} kWh` : `${kwhWhole}.${whRemainder}`;
}

/**
 * Formats UTC date in Malaysia timezone (Asia/Kuala_Lumpur) per REQ-BIL-004
 */
export function formatMalaysiaDateTime(
  dateInput: Date | string | null | undefined,
  locale: "en" | "ms" | "zh" = "en"
): string {
  if (!dateInput) return "-";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "-";
  const localeTag = locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-MY";
  return new Intl.DateTimeFormat(localeTag, {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
