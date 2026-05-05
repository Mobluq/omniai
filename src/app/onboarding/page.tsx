import { redirect } from "next/navigation";
import { AIAccessOnboarding } from "@/components/onboarding/ai-access-onboarding";
import { requireUser } from "@/lib/auth/session";
import { WorkspaceService } from "@/modules/workspace/workspace-service";

export default async function OnboardingPage() {
  const user = await requireUser();
  const workspaces = await new WorkspaceService().listForUser(user.id);
  const workspace = workspaces[0];

  if (!workspace) {
    redirect("/auth/sign-in");
  }

  return (
    <AIAccessOnboarding
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      initialMode={workspace.aiAccountMode}
      initialRoutingMode={workspace.defaultRoutingMode}
      initialMemoryEnabled={workspace.memoryEnabled}
    />
  );
}
