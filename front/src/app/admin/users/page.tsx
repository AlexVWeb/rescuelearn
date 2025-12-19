import { Suspense } from "react";
import { getUsersAction, deleteUserAction, updateUserAction, createUserAction } from "@/app/actions/user-actions";
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
import ClientPage from "./client-page"; // We need a client wrapper for state

// Since the dialog and table interaction requires state (open dialog, selected user), 
// it is cleaner to make the main page content a Client Component or use a Client Wrapper.
// However, we want to fetch data on the server.
// Strategy: Page fetches data -> Passes to Client Component Wrapper.

export default async function UsersPage(props: { searchParams?: Promise<{ page?: string; search?: string }> }) {
    const searchParams = await props.searchParams;
    const page = Number(searchParams?.page) || 1;
    const search = searchParams?.search || "";

    // Note: getUsersAction returns { success, data, meta }
    const result = await getUsersAction(page, 100, search); // Fetching 100 for client-side pagination simplicity
    const users = result.success ? result.data : [];

    return (
        <ClientPage initialUsers={users} />
    );
}
