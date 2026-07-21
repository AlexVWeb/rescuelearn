"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

const routeNameMap: Record<string, string> = {
  admin: "Dashboard",
  users: "Utilisateurs",
  referenciels: "Référentiels",
  snv: "SNV",
  scenarios: "Scénarios",
  victims: "Victimes",
  quiz: "Quiz",
  quizzes: "Quiz",
  questions: "Questions",
  sessions: "Sessions",
  stagiaires: "Stagiaires",
  organisme: "Mon organisme",
  new: "Nouveau",
  edit: "Modifier",
  dashboard: "Tableau de bord",
};

export function AdminBreadcrumb() {
  const pathname = usePathname() || "";
  const items: { name: string; href: string }[] = [];

  if (pathname.startsWith("/admin/training")) {
    // Organisme admin / Trainer space
    items.push({ name: "Tableau de bord", href: "/admin/training/dashboard" });

    const subPath = pathname.replace(/^\/admin\/training/, "");
    const segments = subPath.split("/").filter((s) => s !== "");

    // If the first segment is "dashboard", we don't need to add it since we already have the root "Tableau de bord"
    if (segments.length > 0 && segments[0] !== "dashboard") {
      let accumulatedPath = "/admin/training";
      segments.forEach((segment) => {
        accumulatedPath += `/${segment}`;
        const name =
          routeNameMap[segment] ||
          segment.charAt(0).toUpperCase() + segment.slice(1);
        items.push({ name, href: accumulatedPath });
      });
    }
  } else if (pathname.startsWith("/admin")) {
    // Super admin space
    items.push({ name: "Dashboard", href: "/admin" });

    const subPath = pathname.replace(/^\/admin/, "");
    const segments = subPath.split("/").filter((s) => s !== "");

    let accumulatedPath = "/admin";
    segments.forEach((segment) => {
      accumulatedPath += `/${segment}`;
      const name =
        routeNameMap[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      items.push({ name, href: accumulatedPath });
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={item.href}>
              <BreadcrumbItem className="hidden md:block">
                {isLast ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href}>{item.name}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
