import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const issuer = "OmniAI";

function base32Encode(bytes: Buffer) {
  let bits = "";
  let output = "";

  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += alphabet[Number.parseInt(chunk, 2)];
  }

  return output;
}

function base32Decode(secret: string) {
  const normalized = secret.replace(/\s+/g, "").replace(/=+$/g, "").toUpperCase();
  let bits = "";

  for (const character of normalized) {
    const value = alphabet.indexOf(character);

    if (value === -1) {
      throw new Error("Invalid TOTP secret.");
    }

    bits += value.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return String(code % 1_000_000).padStart(6, "0");
}

function timingSafeCodeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function createTotpUri(input: { email: string; secret: string }) {
  const label = encodeURIComponent(`${issuer}:${input.email}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

export function verifyTotpToken(input: { secret: string; token: string; window?: number }) {
  const token = input.token.replace(/\s+/g, "");
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  const window = input.window ?? 1;

  for (let offset = -window; offset <= window; offset += 1) {
    if (timingSafeCodeEqual(hotp(input.secret, currentCounter + offset), token)) {
      return true;
    }
  }

  return false;
}

export function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const raw = base32Encode(randomBytes(8));
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}
