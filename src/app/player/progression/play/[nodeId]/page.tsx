import React from "react";
import { startProgressionNodeSessionAction } from "@/app/actions/progression-player-actions";
import { redirect } from "next/navigation";
import PlaySessionClient from "./play-session";

export default async function ProgressionPlayPage(props: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await props.params;

  const result = await startProgressionNodeSessionAction(nodeId);
  if (!result.success || !result.data) {
    redirect("/player/progresser");
  }

  return <PlaySessionClient sessionData={result.data} />;
}
