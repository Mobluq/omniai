CREATE TYPE "OtpPurpose" AS ENUM ('sign_in', 'email_verify', 'phone_verify', 'password_reset');

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "identifier" TEXT NOT NULL,
  "purpose" "OtpPurpose" NOT NULL DEFAULT 'sign_in',
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpChallenge_identifier_purpose_expiresAt_idx" ON "OtpChallenge"("identifier", "purpose", "expiresAt");
CREATE INDEX "OtpChallenge_userId_purpose_idx" ON "OtpChallenge"("userId", "purpose");
CREATE INDEX "OtpChallenge_consumedAt_idx" ON "OtpChallenge"("consumedAt");

ALTER TABLE "OtpChallenge"
  ADD CONSTRAINT "OtpChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
