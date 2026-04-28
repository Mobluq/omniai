CREATE TABLE IF NOT EXISTS "WorkspaceInvite" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'member',
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT,
  "acceptedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvite_tokenHash_key" ON "WorkspaceInvite"("tokenHash");
CREATE INDEX IF NOT EXISTS "WorkspaceInvite_workspaceId_email_idx" ON "WorkspaceInvite"("workspaceId", "email");
CREATE INDEX IF NOT EXISTS "WorkspaceInvite_expiresAt_idx" ON "WorkspaceInvite"("expiresAt");
CREATE INDEX IF NOT EXISTS "WorkspaceInvite_acceptedAt_revokedAt_idx" ON "WorkspaceInvite"("acceptedAt", "revokedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_workspaceId_fkey'
  ) THEN
    ALTER TABLE "WorkspaceInvite"
    ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_invitedById_fkey'
  ) THEN
    ALTER TABLE "WorkspaceInvite"
    ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_acceptedById_fkey'
  ) THEN
    ALTER TABLE "WorkspaceInvite"
    ADD CONSTRAINT "WorkspaceInvite_acceptedById_fkey"
    FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
