import { getVictimsAction } from "@/app/actions/snv-actions";
import VictimsClientPage from "./client-page";

export default async function VictimsPage(props: { searchParams?: Promise<{ page?: string; search?: string }> }) {
    const searchParams = await props.searchParams;
    const page = Number(searchParams?.page) || 1;
    const search = searchParams?.search || "";

    const result = await getVictimsAction(page, 100, search);
    const victims = result.success ? result.data : [];

    return (
        <VictimsClientPage initialVictims={victims as any} />
    );
}
