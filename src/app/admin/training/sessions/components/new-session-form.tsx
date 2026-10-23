"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SessionForm } from "./session-form";
import type { SessionFormateurUser } from "@/app/admin/training/types";

export function NewSessionForm({
  members,
}: {
  members: SessionFormateurUser[];
}) {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Nouvelle session
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Commencez par les informations générales. Vous ajouterez ensuite le
          programme, les stagiaires et les groupes.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Détails de la session</CardTitle>
          <CardDescription>
            Titre, type, lieu, dates et capacité de la formation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionForm
            members={members}
            onCancel={() => router.push("/admin/training/sessions")}
            onSuccess={(id) => {
              if (id) {
                router.push(
                  `/admin/training/sessions/${id}?phase=prepare&section=programme`
                );
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
