import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env/server";

const algorithm = "aes-256-gcm";

function getKey() {
  const env = getServerEnv();
  return createHash("sha256")
    .update(env.APP_ENCRYPTION_KEY ?? env.NEXTAUTH_SECRET)
    .digest();
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(encryptedSecret: string) {
  const [version, iv, authTag, encrypted] = encryptedSecret.split(":");

  if (version !== "v1" || !iv || !authTag || !encrypted) {
    throw new Error("Unsupported encrypted secret format.");
  }

  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
