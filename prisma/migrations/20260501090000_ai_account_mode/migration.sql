CREATE TYPE "AIAccountMode" AS ENUM ('managed', 'byok', 'hybrid');

ALTER TABLE "Workspace"
ADD COLUMN "aiAccountMode" "AIAccountMode" NOT NULL DEFAULT 'managed',
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
