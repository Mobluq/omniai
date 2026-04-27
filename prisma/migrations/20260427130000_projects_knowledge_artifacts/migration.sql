CREATE TYPE "ProjectStatus" AS ENUM ('active', 'archived');

CREATE TYPE "ArtifactType" AS ENUM ('document', 'image', 'code', 'research', 'proposal', 'prompt', 'other');

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "defaultRoutingMode" "RoutingMode" NOT NULL DEFAULT 'suggest',
  "defaultProvider" TEXT,
  "defaultModelId" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Artifact" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT,
  "conversationId" TEXT,
  "messageId" TEXT,
  "createdById" TEXT,
  "type" "ArtifactType" NOT NULL DEFAULT 'other',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "provider" TEXT,
  "modelId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Conversation" ADD COLUMN "projectId" TEXT;
ALTER TABLE "KnowledgeSource" ADD COLUMN "projectId" TEXT;

CREATE UNIQUE INDEX "Project_workspaceId_slug_key" ON "Project"("workspaceId", "slug");
CREATE INDEX "Project_workspaceId_status_updatedAt_idx" ON "Project"("workspaceId", "status", "updatedAt");
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");
CREATE INDEX "Conversation_projectId_updatedAt_idx" ON "Conversation"("projectId", "updatedAt");
CREATE INDEX "KnowledgeSource_projectId_createdAt_idx" ON "KnowledgeSource"("projectId", "createdAt");
CREATE INDEX "Artifact_workspaceId_createdAt_idx" ON "Artifact"("workspaceId", "createdAt");
CREATE INDEX "Artifact_projectId_createdAt_idx" ON "Artifact"("projectId", "createdAt");
CREATE INDEX "Artifact_conversationId_idx" ON "Artifact"("conversationId");
CREATE INDEX "Artifact_messageId_idx" ON "Artifact"("messageId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
