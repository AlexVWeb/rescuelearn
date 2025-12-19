"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    Command,
    Frame,
    GalleryVerticalEnd,
    Map,
    PieChart,
    Settings2,
    SquareTerminal,
    Users,
    Activity,
    GraduationCap,
    FileText,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"

// ... imports

// This is sample data.
const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/admin",
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: "Overview",
                    url: "/admin",
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
    ],
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: any }) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
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
    )
}
