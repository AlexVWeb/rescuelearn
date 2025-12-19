import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function AdminPage() {
    return (
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Total Users</CardTitle>
                    <CardDescription>Active users on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">1,234</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Revenue</CardTitle>
                    <CardDescription>Total revenue this month</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">$12,345</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>Users currently online</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">42</div>
                </CardContent>
            </Card>
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min md:col-span-3" />
        </div>
    )
}
