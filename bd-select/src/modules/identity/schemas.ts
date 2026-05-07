import { z } from "zod";

export const requestOtpSchema = z.object({
  identifier: z.string().trim().min(5).max(160),
  purpose: z.enum(["sign_in", "email_verify", "phone_verify", "password_reset"]).default("sign_in"),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().trim().min(5).max(160),
  purpose: z.enum(["sign_in", "email_verify", "phone_verify", "password_reset"]).default("sign_in"),
  code: z.string().trim().regex(/^\d{6}$/),
  name: z.string().trim().min(2).max(120).optional(),
});

export const submitKycSchema = z.object({
  provider: z.enum(["mono", "dojah", "manual"]).default("manual"),
  verificationType: z.enum(["bvn", "nin", "passport"]),
  identityLast4: z.string().trim().regex(/^\d{4}$/),
  legalName: z.string().trim().min(2).max(160),
  selfieChecked: z.boolean().default(false),
});

export const upsertSellerProfileSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1000).optional(),
  payoutToken: z.string().trim().min(6).max(200).optional(),
  defaultHubCode: z.string().trim().max(80).optional(),
});
