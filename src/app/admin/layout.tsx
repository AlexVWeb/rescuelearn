import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { Separator } from "@/components/ui/separator";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { User } from "@/app/actions/user-actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }
  return (
    <SidebarProvider>
      <AppSidebar user={session.user as unknown as User} />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AdminBreadcrumb />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
