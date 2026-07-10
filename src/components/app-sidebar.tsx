"use client";

import * as React from "react";
import {
  BookOpen,
  GalleryVerticalEnd,
  SquareTerminal,
  Users,
  Activity,
  GraduationCap,
  FileText,
  Calendar,
  Building,
  Milestone,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { UserRole, hasRole } from "@/lib/roles";
import { NavUser } from "@/components/nav-user";
import { User } from "@/app/actions/user-actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Compute sidebar data dynamically based on user roles
const getNavData = (roles: unknown, hasOrganisme: boolean) => {
  const isSuperAdmin = hasRole(roles, UserRole.SUPER_ADMIN);
  const isFormateur =
    (hasRole(roles, UserRole.FORMATEUR) ||
      hasRole(roles, UserRole.ADMIN_ORGANISME) ||
      isSuperAdmin) &&
    hasOrganisme;
  const isAdminOrganisme =
    hasRole(roles, UserRole.ADMIN_ORGANISME) && hasOrganisme;

  const trainingSubItems = [
    { title: "Tableau de bord", url: "/admin/training/dashboard" },
    { title: "Sessions", url: "/admin/training/sessions" },
    { title: "Stagiaires", url: "/admin/training/stagiaires" },
    ...(isAdminOrganisme
      ? [{ title: "Mon organisme", url: "/admin/training/organisme" }]
      : []),
  ];

  const trainingItems = isFormateur
    ? [
        {
          title: "Gest. Formations",
          url: "#",
          icon: Calendar,
          isActive: true,
          items: trainingSubItems,
        },
      ]
    : [];

  const superAdminItems =
    isSuperAdmin && !hasOrganisme
      ? [
          {
            title: "Tableau de bord",
            url: "/admin",
            icon: SquareTerminal,
            isActive: !isFormateur,
            items: [
              {
                title: "Overview",
                url: "/admin",
              },
            ],
          },
          {
            title: "Organismes",
            url: "/admin/organismes",
            icon: Building,
            items: [
              {
                title: "Gérer les organismes",
                url: "/admin/organismes",
              },
            ],
          },
          {
            title: "Utilisateurs",
            url: "/admin/users",
            icon: Users,
            items: [
              {
                title: "Gérer les utilisateurs",
                url: "/admin/users",
              },
            ],
          },
          {
            title: "Quiz",
            url: "#",
            icon: BookOpen,
            items: [
              {
                title: "Quiz",
                url: "/admin/quiz/quizzes",
              },
              {
                title: "Questions",
                url: "/admin/quiz/questions",
              },
            ],
          },
          {
            title: "SNV",
            url: "#",
            icon: Activity,
            items: [
              {
                title: "Scénarios",
                url: "/admin/snv/scenarios",
              },
              {
                title: "Victimes",
                url: "/admin/snv/victims",
              },
            ],
          },
          {
            title: "Cartes d'apprentissage",
            url: "#",
            icon: GraduationCap,
            items: [
              {
                title: "Cartes",
                url: "/admin/cards",
              },
            ],
          },
          {
            title: "Référentiels",
            url: "#",
            icon: FileText,
            items: [
              {
                title: "Référentiels",
                url: "/admin/referenciels",
              },
            ],
          },
          {
            title: "Progression (Duolingo)",
            url: "#",
            icon: Milestone,
            items: [
              {
                title: "Gérer le parcours",
                url: "/admin/progression",
              },
            ],
          },
        ]
      : [];

  return {
    navMain: [...superAdminItems, ...trainingItems],
  };
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User }) {
  const hasOrganisme = !!user?.organismeId;
  const data = getNavData(user?.roles, hasOrganisme);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <GalleryVerticalEnd className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">RescueLearn</span>
            <span className="truncate text-xs">Admin</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
