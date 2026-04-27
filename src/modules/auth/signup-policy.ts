import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { forbidden } from "@/lib/errors/app-error";
import { getServerEnv } from "@/lib/env/server";

type SignupMode = "public" | "invite" | "disabled";

function hashInviteCode(value: string) {
  return createHash("sha256").update(value).digest();
}

function secureCompare(expected: string, actual?: string) {
  if (!actual) {
    return false;
  }

  return timingSafeEqual(hashInviteCode(expected), hashInviteCode(actual));
}

function getSignupPolicy(): { mode: SignupMode; inviteCode?: string } {
  const env = getServerEnv();
  const configured = env.SIGNUP_MODE;

  if (configured) {
    return { mode: configured, inviteCode: env.SIGNUP_INVITE_CODE };
  }

  return {
    mode: env.NODE_ENV === "production" ? "invite" : "public",
    inviteCode: env.SIGNUP_INVITE_CODE,
  };
}

export function assertSignupAllowed(inviteCode?: string) {
  const { mode, inviteCode: expectedCode } = getSignupPolicy();

  if (mode === "disabled") {
    throw forbidden("Signup is currently disabled.");
  }

  if (mode === "invite") {
    if (!expectedCode || !secureCompare(expectedCode, inviteCode)) {
      throw forbidden("A valid invite code is required to create an account.");
    }
  }
}
