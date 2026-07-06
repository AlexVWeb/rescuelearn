import React from "react";
import { getUserContext } from "@/lib/context";
import { UserRole, hasRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserContext();

  if (!user.organismeId) {
    if (hasRole(user.roles, UserRole.SUPER_ADMIN)) {
      redirect("/admin");
    } else {
      redirect("/");
    }
  }

  return <>{children}</>;
}
