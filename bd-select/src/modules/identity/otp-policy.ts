import type { OtpPurpose } from "@prisma/client";
import { sha256 } from "@/lib/security/encryption";

export const DEV_OTP_CODE = "000000";
export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;

export function normalizeIdentityIdentifier(identifier: string) {
  const value = identifier.trim().toLowerCase();

  if (value.includes("@")) {
    return value;
  }

  return value.replace(/[^\d+]/g, "").replace(/^\+234/, "0");
}

export function classifyIdentifier(identifier: string): "email" | "phone" {
  return normalizeIdentityIdentifier(identifier).includes("@") ? "email" : "phone";
}

export function isValidIdentityIdentifier(identifier: string) {
  const normalized = normalizeIdentityIdentifier(identifier);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || /^(?:0[789][01]\d{8})$/.test(normalized);
}

export function otpExpiresAt(now = new Date()) {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

export function hashOtpCode(identifier: string, purpose: OtpPurpose, code: string, secret: string) {
  return sha256([normalizeIdentityIdentifier(identifier), purpose, code, secret].join(":"));
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000)).slice(0, OTP_LENGTH);
}
