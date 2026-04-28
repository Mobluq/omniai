import "server-only";
import { logger } from "@/lib/logger/logger";

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

type EmailVerificationInput = {
  to: string;
  verificationUrl: string;
};

type WorkspaceInviteEmailInput = {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function isTransactionalEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    logger.warn("Password reset email skipped because email transport is not configured", {
      emailConfigured: false,
    });
    return { sent: false, reason: "not_configured" as const };
  }

  const safeResetUrl = escapeHtml(input.resetUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: "Reset your OmniAI password",
      text: `Use this secure link to reset your OmniAI password. The link expires in 30 minutes.\n\n${input.resetUrl}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:20px;margin:0 0 12px">Reset your OmniAI password</h1>
          <p>Use this secure link to choose a new password. The link expires in 30 minutes.</p>
          <p><a href="${safeResetUrl}" style="color:#2563eb">Reset password</a></p>
          <p style="font-size:13px;color:#6b7280">If you did not request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    logger.warn("Password reset email delivery failed", {
      status: response.status,
    });
    return { sent: false, reason: "send_failed" as const };
  }

  return { sent: true, reason: null };
}

export async function sendEmailVerificationEmail(input: EmailVerificationInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    logger.warn("Email verification skipped because email transport is not configured", {
      emailConfigured: false,
    });
    return { sent: false, reason: "not_configured" as const };
  }

  const safeVerificationUrl = escapeHtml(input.verificationUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: "Verify your OmniAI email",
      text: `Verify your OmniAI email address with this secure link. The link expires in 24 hours.\n\n${input.verificationUrl}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:20px;margin:0 0 12px">Verify your OmniAI email</h1>
          <p>Confirm this email address so your OmniAI account can receive security and workspace updates.</p>
          <p><a href="${safeVerificationUrl}" style="color:#2563eb">Verify email</a></p>
          <p style="font-size:13px;color:#6b7280">This link expires in 24 hours.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    logger.warn("Email verification delivery failed", {
      status: response.status,
    });
    return { sent: false, reason: "send_failed" as const };
  }

  return { sent: true, reason: null };
}

export async function sendWorkspaceInviteEmail(input: WorkspaceInviteEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    logger.warn("Workspace invite email skipped because email transport is not configured", {
      emailConfigured: false,
    });
    return { sent: false, reason: "not_configured" as const };
  }

  const safeInviteUrl = escapeHtml(input.inviteUrl);
  const safeWorkspaceName = escapeHtml(input.workspaceName);
  const safeInviterName = escapeHtml(input.inviterName);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: `You're invited to ${input.workspaceName} on OmniAI`,
      text: `${input.inviterName} invited you to join ${input.workspaceName} on OmniAI.\n\nAccept the invite here: ${input.inviteUrl}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:20px;margin:0 0 12px">Join ${safeWorkspaceName} on OmniAI</h1>
          <p>${safeInviterName} invited you to collaborate in this OmniAI workspace.</p>
          <p><a href="${safeInviteUrl}" style="color:#2563eb">Accept invite</a></p>
          <p style="font-size:13px;color:#6b7280">This invite expires in 7 days.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    logger.warn("Workspace invite email delivery failed", {
      status: response.status,
    });
    return { sent: false, reason: "send_failed" as const };
  }

  return { sent: true, reason: null };
}
