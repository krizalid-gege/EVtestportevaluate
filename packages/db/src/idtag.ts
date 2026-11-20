import crypto from "node:crypto";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates an OCPP 1.6J compliant idTag (strictly <= 20 characters).
 * Format: "ord_" + 12 random characters = 16 chars total.
 */
export function generateOrderOcppIdTag(): string {
  const bytes = crypto.randomBytes(12);
  let token = "ord_";
  for (let i = 0; i < 12; i++) {
    token += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return token;
}

/**
 * Generates a non-sequential opaque QR token for a Connector (REQ-DEV-004).
 */
export function generateOpaqueQrToken(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let token = "";
  for (let i = 0; i < length; i++) {
    token += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return token;
}

/**
 * Validates and classifies an OCPP 1.6J idTag (supports QR order tags, RFID,
 * 6-byte EVCC MAC AutoCharge / "VIN start" tags, and ISO 15118 eMAID tokens).
 */
export function classifyOcppIdTag(idTag: string): {
  valid: boolean;
  type: "ORDER_TOKEN" | "EVCC_MAC_AUTOCHARGE" | "ISO15118_EMAID" | "RFID_OR_CUSTOM" | "INVALID";
  normalized: string;
} {
  if (!idTag || typeof idTag !== "string") {
    return { valid: false, type: "INVALID", normalized: "" };
  }
  const trimmed = idTag.trim();
  if (trimmed.length === 0 || trimmed.length > 20) {
    return { valid: false, type: "INVALID", normalized: trimmed.slice(0, 20) };
  }
  if (trimmed.startsWith("ord_")) {
    return { valid: true, type: "ORDER_TOKEN", normalized: trimmed };
  }
  if (/^(VID:)?[0-9A-Fa-f]{12}$/.test(trimmed)) {
    return { valid: true, type: "EVCC_MAC_AUTOCHARGE", normalized: trimmed.toUpperCase() };
  }
  if (/^[A-Za-z]{2}-?[A-Za-z0-9]{3}-?C[A-Za-z0-9]{6,9}(-?[A-Za-z0-9])?$/.test(trimmed)) {
    return { valid: true, type: "ISO15118_EMAID", normalized: trimmed.toUpperCase() };
  }
  return { valid: true, type: "RFID_OR_CUSTOM", normalized: trimmed };
}
