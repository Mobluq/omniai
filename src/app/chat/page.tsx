import { AppShell } from "@/components/layout/app-shell";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export default function ChatPage() {
  return (
    <AppShell>
      <div className="page-shell mb-5 hidden lg:block">
        <p className="page-kicker">Unified conversation</p>
        <h1 className="page-title mt-2">Chat with routing intelligence</h1>
        <p className="page-copy">
          Store the prompt first, evaluate intent, then decide whether to stay with the selected model or switch to the stronger provider for the task.
        </p>
      </div>
      <ChatWorkspace />
    </AppShell>
  );
}
