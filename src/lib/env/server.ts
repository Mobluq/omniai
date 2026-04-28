import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_AI_API_KEY: z.string().optional(),
    MISTRAL_API_KEY: z.string().optional(),
    STABILITY_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false"]).optional(),
    SENTRY_DSN: z.string().optional(),
    APP_URL: z.string().url().optional(),
    APP_ENCRYPTION_KEY: z.string().min(32).optional(),
    SIGNUP_MODE: z.enum(["public", "invite", "disabled"]).optional(),
    SIGNUP_INVITE_CODE: z.string().optional(),
    OPENAI_TEXT_MODEL: z.string().optional(),
    OPENAI_IMAGE_MODEL: z.string().optional(),
    ANTHROPIC_MODEL: z.string().optional(),
    GOOGLE_AI_MODEL: z.string().optional(),
    MISTRAL_MODEL: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_SESSION_TOKEN: z.string().optional(),
    AWS_BEDROCK_MODEL_ID: z.string().optional(),
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
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const missingKeys = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment configuration: ${missingKeys}`);
  }

  return result.data;
}
