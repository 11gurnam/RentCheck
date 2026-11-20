import Link from "next/link";
import { AdminActionMenu } from "@/features/admin-platform/action-menu";
import { ManagementPage } from "@/features/admin-platform/management-page";

export default async function DisputesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <ManagementPage kind="cases" params={await searchParams} headerActions={
      <AdminActionMenu label="Related report queues">
        <Link href="/admin/reports">Review and photo reports</Link>
        <Link href="/admin/messages">Message reports</Link>
        <Link href="/admin/duplicates">Duplicate listings</Link>
      </AdminActionMenu>
    } />
  );
}
