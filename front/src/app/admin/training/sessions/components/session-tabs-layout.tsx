"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SlotsTab } from "../[id]/components/slots-tab";
import { InscriptionsTab } from "../[id]/components/inscriptions-tab";
import { EmargementTab } from "../[id]/components/emargement-tab";
import { SessionForm } from "./session-form";
import {
  Inscription,
  Slot,
  Trainee,
  TrainingSession,
} from "@/app/admin/training/types";

interface SessionTabsLayoutProps {
  session?: TrainingSession & { slots: Slot[]; inscriptions: Inscription[] };
  allTrainees?: Trainee[];
  isNew?: boolean;
}

export function SessionTabsLayout({
  session,
  allTrainees = [],
  isNew = false,
}: SessionTabsLayoutProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(isNew ? "settings" : "slots");

  const slots = session?.slots || [];
  const inscriptions = session?.inscriptions || [];

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isNew ? "Nouvelle Session" : session?.title}
            </h1>
          </div>
        </div>
        <div className="bg-muted h-10 w-full animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isNew ? "Nouvelle Session" : session?.title}
          </h1>
          {!isNew && session && (
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{session.type}</Badge>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {session.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {inscriptions.length} /{" "}
                {session.maxTrainees} inscrits
              </span>
              <Badge
                variant={session.status === "terminée" ? "default" : "outline"}
              >
                {session.status}
              </Badge>
            </div>
          )}
          {isNew && (
            <p className="text-muted-foreground text-sm sm:text-base">
              Créez une nouvelle session de formation.
            </p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[800px] grid-cols-2 sm:grid-cols-4">
          <TabsTrigger
            value="slots"
            disabled={isNew}
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Programme (Créneaux)</span>
            <span className="sm:hidden">Programme</span>
          </TabsTrigger>
          <TabsTrigger
            value="inscriptions"
            disabled={isNew}
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">
              Stagiaires ({inscriptions.length})
            </span>
            <span className="sm:hidden">Stagiaires</span>
          </TabsTrigger>
          <TabsTrigger
            value="emargement"
            disabled={isNew}
            className="text-xs sm:text-sm"
          >
            Émargements
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">
            <Settings className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Paramètres</span>
            <span className="sm:hidden">Param.</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="slots"
          className="mt-4 h-full min-h-[400px] space-y-4"
        >
          {session && (
            <SlotsTab
              sessionId={session.id}
              slots={slots}
              sessionStartDate={session.startDate}
              sessionEndDate={session.endDate}
            />
          )}
        </TabsContent>

        <TabsContent value="inscriptions" className="mt-4 space-y-4">
          {session && (
            <InscriptionsTab
              sessionId={session.id}
              inscriptions={inscriptions}
              allTrainees={allTrainees}
              maxTrainees={session.maxTrainees}
            />
          )}
        </TabsContent>

        <TabsContent value="emargement" className="mt-4 space-y-4">
          {session && (
            <EmargementTab
              sessionId={session.id}
              sessionTitle={session.title}
              sessionLocation={session.location}
              sessionType={session.type}
              slots={slots}
              inscriptions={inscriptions}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isNew ? "Détails de la session" : "Paramètres de la session"}
              </CardTitle>
              <CardDescription>
                {isNew
                  ? "Remplissez les informations de base de la formation."
                  : "Modifiez les informations générales de la formation."}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl">
              <SessionForm
                sessionItem={session as any}
                onCancel={
                  isNew
                    ? () => router.push("/admin/training/sessions")
                    : undefined
                }
                onSuccess={(id) => {
                  if (isNew && id) {
                    router.push(`/admin/training/sessions/${id}`);
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
