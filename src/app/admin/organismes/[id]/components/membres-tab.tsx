"use client";

import dayjs from "dayjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  updateMemberRoleAction,
  removeMemberFromOrganismeAction,
} from "@/app/actions/members.actions";
import {
  cancelInvitationAction,
  resendInvitationAction,
} from "@/app/actions/invitation.actions";
import { InviteMemberDialog } from "@/components/admin/invite-member-dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { UserRole } from "@/lib/roles";
import { OrganismeMember } from "@/types/organisme";

export interface InvitationInfo {
  id: string;
  email: string;
  role: string;
  createdAt: string | Date;
  expiresAt: string | Date;
}

interface MembresTabProps {
  organismeId: string;
  members: OrganismeMember[];
  invitations: InvitationInfo[];
}

const ROLES = [UserRole.ADMIN_ORGANISME, UserRole.FORMATEUR];

export function MembresTab({
  organismeId,
  members: initialMembers,
  invitations,
}: MembresTabProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const getMemberName = (m: OrganismeMember) => {
    if (m.firstName || m.lastName)
      return `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
    return m.name ?? m.email;
  };

  const getMemberRoles = (m: OrganismeMember): string[] => {
    if (Array.isArray(m.roles)) return m.roles as string[];
    return [];
  };

  const handleRoleChange = async (userId: string, role: string) => {
    const result = await updateMemberRoleAction(userId, [role]);
    if (result.success) {
      toast.success("Rôle mis à jour");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    const result = await removeMemberFromOrganismeAction(memberToRemove);
    if (result.success) {
      toast.success("Membre retiré");
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove));
    } else {
      toast.error(result.error ?? "Erreur");
    }
    setMemberToRemove(null);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitationAction(invitationId);
    if (result.success) {
      toast.success("Invitation annulée");
      router.refresh();
    } else {
      toast.error(result.error || "Erreur");
    }
  };
  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    const result = await resendInvitationAction(invitationId);
    setResendingId(null);
    if (result.success) {
      toast.success("Invitation renvoyée avec succès");
      router.refresh();
    } else {
      toast.error(result.error || "Erreur");
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Membres rattachés</h3>
          <p className="text-muted-foreground text-sm">
            Liste des utilisateurs ayant accès à cet organisme.
          </p>
        </div>
        <InviteMemberDialog organismeId={organismeId} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Membre depuis</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  Aucun membre dans cet organisme.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {getMemberName(member)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={getMemberRoles(member)[0] ?? "formateur"}
                      onValueChange={(role) =>
                        handleRoleChange(member.id, role)
                      }
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dayjs(member.createdAt).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => setMemberToRemove(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {invitations.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Invitations en attente</h3>
            <p className="text-muted-foreground text-sm">
              Personnes invitées n&apos;ayant pas encore créé leur compte.
            </p>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle prévu</TableHead>
                  <TableHead>Envoyé le</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{inv.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {dayjs(inv.createdAt).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {dayjs(inv.expiresAt).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-8 w-8 hover:text-blue-600"
                          onClick={() => handleResendInvitation(inv.id)}
                          disabled={resendingId === inv.id}
                          title="Renvoyer l'email d'invitation"
                        >
                          <Mail
                            className={`h-4 w-4 ${resendingId === inv.id ? "animate-pulse" : ""}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          onClick={() => handleCancelInvitation(inv.id)}
                          title="Annuler l'invitation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(o) => !o && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte utilisateur sera conservé mais il ne sera plus rattaché
              à cet organisme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
