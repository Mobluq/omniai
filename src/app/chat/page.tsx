import { AppShell } from "@/components/layout/app-shell";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export default function ChatPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One conversation interface with model selection, recommendation, and routing controls.
        </p>
      </div>
      <ChatWorkspace />
    </AppShell>
  );
}
