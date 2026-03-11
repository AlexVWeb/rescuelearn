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
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Compute sidebar data dynamically based on user roles
const getNavData = (userRoles: string[]) => {
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN");
  const isFormateur =
    userRoles.includes("FORMATEUR") ||
    userRoles.includes("ADMIN_ORGANISME") ||
    isSuperAdmin;
  const isAdminOrganisme =
    userRoles.includes("ADMIN_ORGANISME") || isSuperAdmin;

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

  const superAdminItems = isSuperAdmin
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
            {
              title: "Options",
              url: "/admin/quiz/options",
            },
            {
              title: "Catégories",
              url: "/admin/quiz/categories",
            },
            {
              title: "Niveaux",
              url: "/admin/quiz/levels",
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
      ]
    : [];

  return {
    navMain: [...superAdminItems, ...trainingItems],
  };
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: any }) {
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const data = getNavData(userRoles);

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
