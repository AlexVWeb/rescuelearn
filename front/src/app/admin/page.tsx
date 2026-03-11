import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminStatsAction } from "@/app/actions/stats-actions";
import { Building2, Users, GraduationCap, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const result = await getAdminStatsAction();
  const stats = result.success
    ? result.data
    : { users: 0, organismes: 0, sessions: 0, trainees: 0 };

  const statCards = [
    {
      title: "Utilisateurs",
      value: stats?.users || 0,
      description: "Utilisateurs inscrits",
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "Organismes",
      value: stats?.organismes || 0,
      description: "Organismes de formation",
      icon: Building2,
      href: "/admin/organismes",
    },
    {
      title: "Sessions",
      value: stats?.sessions || 0,
      description: "Sessions de formation",
      icon: GraduationCap,
      href: "/admin/training/sessions",
    },
    {
      title: "Stagiaires",
      value: stats?.trainees || 0,
      description: "Stagiaires enregistrés",
      icon: ClipboardList,
      href: "/admin/training/stagiaires",
    },
  ];

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Link
          key={stat.title}
          href={stat.href}
          className="block transition-transform hover:scale-[1.01]"
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {stat.description}
                </CardDescription>
              </div>
              <stat.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:col-span-2 md:min-h-min lg:col-span-4" />
    </div>
  );
}
