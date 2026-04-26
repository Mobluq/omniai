import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 56);
}

async function seedPlans() {
  await prisma.plan.upsert({
    where: { code: "free" },
    update: {},
    create: {
      code: "free",
      name: "Free",
      description: "Limited personal access for evaluation.",
      priceCents: 0,
      includedCredits: 100,
      usageLimits: {
        create: [{ metric: "messages", limit: 100, period: "month" }],
      },
    },
  });

  await prisma.plan.upsert({
    where: { code: "pro" },
    update: {},
    create: {
      code: "pro",
      name: "Pro",
      description: "Multi-model access for power users.",
      priceCents: 2900,
      includedCredits: 2000,
      usageLimits: {
        create: [{ metric: "messages", limit: 2000, period: "month" }],
      },
    },
  });

  await prisma.plan.upsert({
    where: { code: "team" },
    update: {},
    create: {
      code: "team",
      name: "Team",
      description: "Shared workspace, collaboration, and centralized usage controls.",
      priceCents: 9900,
      includedCredits: 10000,
      maxSeats: 25,
    },
  });

  await prisma.plan.upsert({
    where: { code: "enterprise" },
    update: {},
    create: {
      code: "enterprise",
      name: "Enterprise",
      description: "Custom routing, security controls, and private deployment options.",
      priceCents: 0,
      includedCredits: 0,
    },
  });
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "OmniAI Admin";
  const workspaceName = process.env.ADMIN_WORKSPACE_NAME?.trim() || "OmniAI Admin Workspace";

  if (!email || !password) {
    console.log("Admin seed skipped. Set ADMIN_EMAIL and ADMIN_PASSWORD to create an owner account.");
    return;
  }

  if (password.length < 16) {
    throw new Error("ADMIN_PASSWORD must be at least 16 characters for seeded admin accounts.");
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
    },
    create: {
      email,
      name,
      passwordHash,
    },
  });

  const workspace =
    (await prisma.workspace.findFirst({
      where: {
        members: {
          some: { userId: user.id, role: "owner" },
        },
      },
    })) ??
    (await prisma.workspace.create({
      data: {
        name: workspaceName,
        slug: `${slugify(workspaceName)}-${crypto.randomUUID().slice(0, 8)}`,
        type: "team",
      },
    }));

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: { role: "owner" },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "owner",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      action: "seed.admin",
      entityType: "user",
      entityId: user.id,
    },
  });

  console.log(`Admin owner account ready for ${email}.`);
}

async function main() {
  await seedPlans();
  await seedAdminUser();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
