import { getServerSession } from "next-auth";
import { unauthorized } from "@/lib/errors/app-error";
import { authOptions } from "@/lib/auth/config";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw unauthorized();
  }

  return user;
}
