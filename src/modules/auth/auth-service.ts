import { hash } from "bcryptjs";
import { conflict } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import type { z } from "zod";
import type { signUpSchema } from "@/lib/validators/api-schemas";

export type SignUpInput = z.infer<typeof signUpSchema>;

function slugifyWorkspaceName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export class AuthService {
  async signUp(input: SignUpInput) {
    const email = input.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw conflict("An account already exists for this email.");
    }

    const passwordHash = await hash(input.password, 12);
    const baseSlug = slugifyWorkspaceName(`${input.name} workspace`);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email,
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${input.name}'s Workspace`,
          slug,
          type: "personal",
          members: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          action: "auth.signup",
          entityType: "user",
          entityId: user.id,
        },
      });

      return { user, workspace };
    });
  }
}
