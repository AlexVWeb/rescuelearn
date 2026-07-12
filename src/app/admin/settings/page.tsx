import React from "react";
import { requireSuperAdmin } from "@/lib/context";
import { getSystemSettingsAction } from "@/app/actions/system-settings-actions";
import { ClientSettingsPage } from "./client-settings-page";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireSuperAdmin();
  const result = await getSystemSettingsAction();
  const initialSettings = result.success && result.data ? result.data : [];

  return <ClientSettingsPage initialSettings={initialSettings} />;
}
