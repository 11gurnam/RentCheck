import { Suspense } from "react";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { AdminSidebar } from "@/features/admin-platform/sidebar";
import { overview } from "@/features/admin-platform/data";
export default async function AdminLayout({children}:{children:React.ReactNode}) {
  await requireUser("/admin");
  if(!(await isAdministrator()))return <AccountShell><section className="dashboard-card boundary-card"><h1>Access restricted.</h1><p>Administrator access is required to manage RentCheck.</p><a href="/account">Return to your account</a></section></AccountShell>;
  const data=await overview();
  return <AccountShell><div className="admin-layout"><Suspense fallback={<aside className="admin-sidebar">Loading navigation…</aside>}><AdminSidebar tenantPending={data.tenant_pending} landlordPending={data.landlord_pending} flagged={data.flagged} disputes={data.disputes}/></Suspense><section className="admin-main" aria-label="Platform administration">{children}</section></div></AccountShell>;
}
