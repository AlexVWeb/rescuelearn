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
};

export function AdminBreadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter((segment) => segment !== "");

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1;
                    const href = `/${segments.slice(0, index + 1).join("/")}`;
                    const name = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

                    return (
                        <React.Fragment key={href}>
                            <BreadcrumbItem className="hidden md:block">
                                {isLast ? (
                                    <BreadcrumbPage>{name}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={href}>
                                        {name}
                                    </BreadcrumbLink>
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
