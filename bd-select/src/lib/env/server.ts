import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    APP_URL: z.string().url().optional(),
    APP_ENCRYPTION_KEY: z.string().min(32).optional(),
    SIGNUP_MODE: z.enum(["public", "invite", "disabled"]).optional(),
    SIGNUP_INVITE_CODE: z.string().optional(),
    REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false"]).optional(),
    ALLOW_TRUSTED_AUTH_HEADERS: z.enum(["true", "false"]).optional(),
    PAYSTACK_SECRET_KEY: z.string().optional(),
    PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
    FLUTTERWAVE_SECRET_KEY: z.string().optional(),
    FLUTTERWAVE_WEBHOOK_SECRET: z.string().optional(),
    TERMII_API_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
    MONO_SECRET_KEY: z.string().optional(),
    DOJAH_APP_ID: z.string().optional(),
    DOJAH_PRIVATE_KEY: z.string().optional(),
    CLOUDFLARE_R2_BUCKET: z.string().optional(),
    CLOUDFLARE_IMAGES_ACCOUNT_ID: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .superRefine((env, context) => {
    const signupMode = env.SIGNUP_MODE ?? (env.NODE_ENV === "production" ? "invite" : "public");

    if (signupMode === "invite" && !env.SIGNUP_INVITE_CODE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SIGNUP_INVITE_CODE"],
        message: "SIGNUP_INVITE_CODE is required when signup is invite-only.",
      });
    }

    if (env.NODE_ENV === "production" && !env.APP_ENCRYPTION_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_ENCRYPTION_KEY"],
        message: "APP_ENCRYPTION_KEY is required in production.",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const invalidKeys = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment configuration: ${invalidKeys}`);
  }

  return result.data;
}
