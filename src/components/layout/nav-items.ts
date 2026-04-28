import {
  Activity,
  Bell,
  Boxes,
  Brain,
  BrainCircuit,
  FileStack,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Boxes },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/knowledge", label: "Knowledge", icon: Brain },
  { href: "/artifacts", label: "Artifacts", icon: FileStack },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/usage", label: "Usage", icon: Activity },
  { href: "/routing", label: "Routing", icon: BrainCircuit },
  { href: "/account", label: "Account", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
