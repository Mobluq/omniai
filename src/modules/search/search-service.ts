import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

export type SearchResultType = "conversation" | "message" | "project" | "knowledge" | "artifact";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  excerpt: string;
  href: string;
  label: string;
  updatedAt: Date;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  groups: Record<SearchResultType, SearchResult[]>;
};

function snippet(value: string | null | undefined, query: string, fallback: string) {
  const text = value?.replace(/\s+/g, " ").trim() || fallback;
  const index = text.toLowerCase().indexOf(query.toLowerCase());

  if (index === -1) {
    return text.slice(0, 220);
  }

  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + query.length + 140);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function emptyGroups(): Record<SearchResultType, SearchResult[]> {
  return {
    conversation: [],
    message: [],
    project: [],
    knowledge: [],
    artifact: [],
  };
}

export class SearchService {
  async search(input: { userId: string; workspaceId: string; query: string; limit?: number }): Promise<SearchResponse> {
    await assertWorkspaceAccess(input.userId, input.workspaceId);

    const query = input.query.trim();
    const limit = input.limit ?? 8;
    const contains = { contains: query, mode: "insensitive" as const };

    const [conversations, messages, projects, knowledgeSources, artifacts] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          workspaceId: input.workspaceId,
          archivedAt: null,
          title: contains,
        },
        select: {
          id: true,
          title: true,
          activeProvider: true,
          activeModelId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.message.findMany({
        where: {
          workspaceId: input.workspaceId,
          content: contains,
          conversation: { archivedAt: null },
        },
        select: {
          id: true,
          content: true,
          role: true,
          modelDisplayName: true,
          createdAt: true,
          conversation: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          status: "active",
          OR: [{ name: contains }, { description: contains }, { instructions: contains }],
        },
        select: {
          id: true,
          name: true,
          description: true,
          instructions: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.knowledgeSource.findMany({
        where: {
          workspaceId: input.workspaceId,
          OR: [
            { title: contains },
            { sourceUri: contains },
            { documents: { some: { sanitizedText: contains } } },
            { documents: { some: { chunks: { some: { content: contains } } } } },
          ],
        },
        select: {
          id: true,
          title: true,
          type: true,
          sourceUri: true,
          updatedAt: true,
          documents: {
            select: {
              sanitizedText: true,
              chunks: {
                where: { content: contains },
                select: { content: true },
                take: 1,
              },
            },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.artifact.findMany({
        where: {
          workspaceId: input.workspaceId,
          OR: [{ title: contains }, { content: contains }],
        },
        select: {
          id: true,
          title: true,
          type: true,
          content: true,
          provider: true,
          modelId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
    ]);

    const groups = emptyGroups();

    groups.conversation = conversations.map((conversation) => ({
      id: conversation.id,
      type: "conversation",
      title: conversation.title,
      excerpt: snippet(
        `${conversation.activeProvider ?? "No provider yet"} ${conversation.activeModelId ?? ""}`,
        query,
        "Conversation",
      ),
      href: `/chat?conversationId=${conversation.id}`,
      label: "Conversation",
      updatedAt: conversation.updatedAt,
    }));

    groups.message = messages.map((message) => ({
      id: message.id,
      type: "message",
      title: message.conversation.title,
      excerpt: snippet(message.content, query, "Message match"),
      href: `/chat?conversationId=${message.conversation.id}`,
      label: `${message.role}${message.modelDisplayName ? ` - ${message.modelDisplayName}` : ""}`,
      updatedAt: message.createdAt,
    }));

    groups.project = projects.map((project) => ({
      id: project.id,
      type: "project",
      title: project.name,
      excerpt: snippet(project.description ?? project.instructions, query, "Project match"),
      href: `/projects?projectId=${project.id}`,
      label: "Project",
      updatedAt: project.updatedAt,
    }));

    groups.knowledge = knowledgeSources.map((source) => {
      const document = source.documents[0];
      return {
        id: source.id,
        type: "knowledge",
        title: source.title,
        excerpt: snippet(document?.chunks[0]?.content ?? document?.sanitizedText ?? source.sourceUri, query, "Knowledge match"),
        href: `/knowledge?sourceId=${source.id}`,
        label: `Knowledge ${source.type}`,
        updatedAt: source.updatedAt,
      };
    });

    groups.artifact = artifacts.map((artifact) => ({
      id: artifact.id,
      type: "artifact",
      title: artifact.title,
      excerpt: snippet(artifact.content, query, "Artifact match"),
      href: `/artifacts?artifactId=${artifact.id}`,
      label: `Artifact ${artifact.type}`,
      updatedAt: artifact.updatedAt,
    }));

    const results = Object.values(groups)
      .flat()
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

    return { query, results, groups };
  }
}
