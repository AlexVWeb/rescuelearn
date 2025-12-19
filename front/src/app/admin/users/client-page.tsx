"use client";

import { useState } from "react";
import { UsersTable } from "@/components/admin/users-table";
import { UserDialog } from "@/components/admin/user-dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { User, deleteUserAction } from "@/app/actions/user-actions";
import { useRouter } from "next/navigation";
interface ClientPageProps {
    initialUsers: any[]; // Using any temporarily to avoid strict type mismatch if inferred types differ
}

export default function ClientPage({ initialUsers }: ClientPageProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const router = useRouter();

    // Safe cast
    const users = initialUsers as User[];

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedUser(null);
        setDialogOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setUserToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (userToDelete) {
            await deleteUserAction(userToDelete);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
            router.refresh();
        }
    };

    return (
        <div className="w-full p-8">
            <div className="flex items-center justify-between space-y-2 mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                    <p className="text-muted-foreground">
                        Manage data tables, roles, and permissions for your users.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                </div>
            </div>

            <div className="w-full">
                <UsersTable
                    data={users}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                />
            </div>

            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={selectedUser}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account
                            and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
