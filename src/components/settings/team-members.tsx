"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, MailPlus, Shield, Trash2, UserMinus, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { parseApiResponse, errorMessage } from "@/lib/api/client";

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
type EditableRole = Exclude<WorkspaceRole, "owner">;

type TeamMember = {
  id: string;
  role: WorkspaceRole;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type PendingInvite = {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  createdAt: string;
};

type TeamPayload = {
  workspace: { id: string; name: string };
  currentRole: WorkspaceRole;
  members: TeamMember[];
  invites: PendingInvite[];
  canManage: boolean;
};

type InviteCreateResult = {
  invite: PendingInvite;
  inviteUrl: string;
  emailConfigured: boolean;
  emailSent: boolean;
};

const roleOptions: EditableRole[] = ["admin", "member", "viewer"];

function roleLabel(role: WorkspaceRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function TeamMembers({ workspaceId }: { workspaceId: string }) {
  const { toast } = useToast();
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<EditableRole>("member");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sortedMembers = useMemo(() => {
    const rank: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2, viewer: 3 };
    return [...(team?.members ?? [])].sort((left, right) => rank[left.role] - rank[right.role]);
  }, [team]);

  async function fetchTeam() {
    return parseApiResponse<TeamPayload>(await fetch(`/api/workspaces/${workspaceId}/members`));
  }

  async function refreshTeam() {
    try {
      const payload = await fetchTeam();
      setTeam(payload);
      setStatus("ready");
    } catch (loadError: unknown) {
      setStatus("error");
      toast({
        title: "Team settings could not be loaded",
        description: errorMessage(loadError),
        variant: "error",
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialTeam() {
      try {
        const payload = await fetchTeam();

        if (!cancelled) {
          setTeam(payload);
          setStatus("ready");
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setStatus("error");
          toast({
            title: "Team settings could not be loaded",
            description: errorMessage(loadError),
            variant: "error",
          });
        }
      }
    }

    void loadInitialTeam();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("invite");
    setInviteUrl(null);

    try {
      const result = await parseApiResponse<InviteCreateResult>(
        await fetch(`/api/workspaces/${workspaceId}/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }),
      );
      setInviteUrl(result.inviteUrl);
      setInviteEmail("");
      toast({
        title: result.emailSent ? "Invite sent" : "Invite created",
        description: result.emailConfigured
          ? `${result.invite.email} can now join ${team?.workspace.name ?? "this workspace"}.`
          : "Email is not configured yet, so share the invite link manually.",
        variant: result.emailSent ? "success" : "warning",
      });
      await refreshTeam();
    } catch (inviteError: unknown) {
      toast({
        title: "Invite failed",
        description: errorMessage(inviteError),
        variant: "error",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function updateRole(member: TeamMember, role: EditableRole) {
    setBusyAction(`role:${member.id}`);
    try {
      await parseApiResponse<{ member: TeamMember }>(
        await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }),
      );
      toast({ title: "Role updated", description: `${member.user.email ?? "Member"} is now ${role}.`, variant: "success" });
      await refreshTeam();
    } catch (roleError: unknown) {
      toast({ title: "Role update failed", description: errorMessage(roleError), variant: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function removeMember(member: TeamMember) {
    const label = member.user.name ?? member.user.email ?? "this member";
    if (!window.confirm(`Remove ${label} from this workspace?`)) {
      return;
    }

    setBusyAction(`remove:${member.id}`);
    try {
      await parseApiResponse<{ removed: boolean }>(
        await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, { method: "DELETE" }),
      );
      toast({ title: "Member removed", description: `${label} no longer has workspace access.`, variant: "success" });
      await refreshTeam();
    } catch (removeError: unknown) {
      toast({ title: "Remove failed", description: errorMessage(removeError), variant: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function revokeInvite(invite: PendingInvite) {
    setBusyAction(`invite:${invite.id}`);
    try {
      await parseApiResponse<{ revoked: boolean }>(
        await fetch(`/api/workspaces/${workspaceId}/invites/${invite.id}`, { method: "DELETE" }),
      );
      toast({ title: "Invite revoked", description: `${invite.email} can no longer use that invite.`, variant: "success" });
      await refreshTeam();
    } catch (revokeError: unknown) {
      toast({ title: "Revoke failed", description: errorMessage(revokeError), variant: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function copyInviteLink() {
    if (!inviteUrl) {
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: "Invite link copied", variant: "success" });
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading") {
    return (
      <Card className="shadow-none">
        <CardContent className="grid min-h-56 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  if (status === "error" || !team) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 shadow-none">
        <CardContent className="p-6 text-sm text-destructive">
          Team settings could not be loaded. Check your workspace access and try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />
              Team members
            </CardTitle>
            <CardDescription>
              Invite collaborators, change access levels, and remove members from {team.workspace.name}.
            </CardDescription>
          </div>
          <Badge className="w-fit bg-muted">{team.members.length} members</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {team.canManage ? (
          <form className="grid gap-3 rounded-lg border bg-muted/20 p-4" onSubmit={createInvite}>
            <div className="grid gap-1">
              <h3 className="text-sm font-semibold">Invite a teammate</h3>
              <p className="text-sm text-muted-foreground">
                Invites expire after 7 days and can only be accepted by the invited email address.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="team-invite-email">Email</Label>
                <Input
                  id="team-invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team-invite-role">Role</Label>
                <Select
                  id="team-invite-role"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as EditableRole)}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={busyAction === "invite"}>
                {busyAction === "invite" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MailPlus className="h-4 w-4" aria-hidden="true" />
                )}
                Invite
              </Button>
            </div>
            {inviteUrl ? (
              <div className="grid gap-2 rounded-md border bg-background p-3">
                <Label htmlFor="latest-invite-link">Latest invite link</Label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input id="latest-invite-link" readOnly value={inviteUrl} className="font-mono text-xs" />
                  <Button type="button" variant="outline" onClick={copyInviteLink}>
                    {copied ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    Copy
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            You can view workspace members. Ask an owner or admin to invite teammates or change roles.
          </div>
        )}

        <div className="grid gap-3">
          <h3 className="text-sm font-semibold">Members</h3>
          <div className="overflow-hidden rounded-lg border">
            {sortedMembers.map((member) => {
              const label = member.user.name ?? member.user.email ?? "Unnamed member";
              const canEditMember = team.canManage && member.role !== "owner";
              return (
                <div
                  key={member.id}
                  className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_160px_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{label}</p>
                      {member.role === "owner" ? (
                        <Badge className="bg-primary/10 text-primary">
                          <Shield className="h-3 w-3" aria-hidden="true" />
                          Owner
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {member.user.email ?? "No email"} - Joined {formatDate(member.createdAt)}
                    </p>
                  </div>
                  {canEditMember ? (
                    <Select
                      value={member.role}
                      onChange={(event) => updateRole(member, event.target.value as EditableRole)}
                      disabled={busyAction === `role:${member.id}`}
                      aria-label={`Change role for ${label}`}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Badge className="w-fit bg-muted">{roleLabel(member.role)}</Badge>
                  )}
                  {canEditMember ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="justify-start text-destructive hover:text-destructive lg:justify-center"
                      onClick={() => removeMember(member)}
                      disabled={busyAction === `remove:${member.id}`}
                    >
                      {busyAction === `remove:${member.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                      )}
                      Remove
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          <h3 className="text-sm font-semibold">Pending invites</h3>
          {team.invites.length ? (
            <div className="overflow-hidden rounded-lg border">
              {team.invites.map((invite) => (
                <div
                  key={invite.id}
                  className="grid gap-3 border-b p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invite.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Expires {formatDate(invite.expiresAt)}</p>
                  </div>
                  <Badge className="w-fit bg-muted">{roleLabel(invite.role)}</Badge>
                  {team.canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="justify-start text-destructive hover:text-destructive md:justify-center"
                      onClick={() => revokeInvite(invite)}
                      disabled={busyAction === `invite:${invite.id}`}
                    >
                      {busyAction === `invite:${invite.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      Revoke
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              No pending invites.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
