ALTER TABLE "User"
ADD COLUMN "jobTitle" TEXT,
ADD COLUMN "companyName" TEXT,
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorSecretEncrypted" TEXT,
ADD COLUMN "twoFactorConfirmedAt" TIMESTAMP(3),
ADD COLUMN "twoFactorRecoveryCodesEncrypted" TEXT;

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emailProductUpdates" BOOLEAN NOT NULL DEFAULT false,
  "emailUsageAlerts" BOOLEAN NOT NULL DEFAULT true,
  "emailSecurityAlerts" BOOLEAN NOT NULL DEFAULT true,
  "emailWeeklyDigest" BOOLEAN NOT NULL DEFAULT true,
  "providerIncidentAlerts" BOOLEAN NOT NULL DEFAULT true,
  "billingAlerts" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

ALTER TABLE "NotificationPreference"
ADD CONSTRAINT "NotificationPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
