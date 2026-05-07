import { sha256 } from "@/lib/security/encryption";
import { redactSensitiveText } from "@/lib/security/redaction";

export function sanitizeUserText(value: string) {
  return redactSensitiveText(value)
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 20000);
}

export function hashSensitiveText(value: string) {
  return sha256(sanitizeUserText(value));
}
