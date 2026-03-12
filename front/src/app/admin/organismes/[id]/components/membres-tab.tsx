"use client";

import dayjs from "dayjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  OrganismeMember,
  updateMemberRoleAction,
  removeMemberFromOrganismeAction,
  addMemberToOrganismeAction,
  searchUsersAction,
} from "@/app/actions/organisme-actions";

interface MembresTabProps {
  organismeId: string;
  members: OrganismeMember[];
}

type SearchUser = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  organismeId: string | null;
};

const ROLES = ["ADMIN_ORGANISME", "FORMATEUR"];

export function MembresTab({
  organismeId,
  members: initialMembers,
}: MembresTabProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const result = await searchUsersAction(searchQuery);
    if (result.success && result.data) {
      setSearchResults(
        result.data.filter((u) => !members.find((m) => m.id === u.id))
      );
    }
    setSearching(false);
  };

  const handleAdd = async (userId: string) => {
    const result = await addMemberToOrganismeAction(userId, organismeId);
    if (result.success) {
      toast.success("Membre ajouté");
      setSearchResults([]);
      setSearchQuery("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="Rechercher un utilisateur par email ou nom..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch} disabled={searching}>
          <UserPlus className="mr-2 h-4 w-4" />
          Rechercher
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom / Email</TableHead>
                <TableHead>Organisme actuel</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchResults.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">
                      {u.firstName ?? u.name ?? "—"}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.organismeId
                      ? "Rattaché à un autre organisme"
                      : "Sans organisme"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => handleAdd(u.id)}>
                      Ajouter
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
