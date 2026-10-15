"use client";
import { NavigationPending } from "@/components/ui/navigation-pending";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ActionIcon } from "@/components/ui/action-feedback";
export function AdminSidebar({tenantPending,landlordPending,flagged,disputes}:{tenantPending:number;landlordPending:number;flagged:number;disputes:number}) {
  const path=usePathname(),params=useSearchParams();
  const links=[
    {label:"Overview",href:"/admin",active:path==="/admin"},
    {label:"Properties",href:"/admin/properties",active:["/admin/properties","/admin/duplicates","/admin/merge","/admin/locations","/admin/associations"].some(p=>path.startsWith(p))},
    {label:"Users",href:"/admin/users",active:path.startsWith("/admin/users")},
    {label:"Tenant Verification",href:"/admin/verification-management?type=tenant",count:tenantPending,active:path==="/admin/verification"||path.includes("/verification-management/tenant/")||(path==="/admin/verification-management"&&params.get("type")==="tenant")},
    {label:"Landlord Verification",href:"/admin/verification-management?type=landlord",count:landlordPending,active:path==="/admin/claims"||path.includes("/verification-management/landlord/")||(path==="/admin/verification-management"&&params.get("type")==="landlord")},
    {label:"Reviews & Moderation",href:"/admin/reviews",count:flagged,active:path==="/admin/reviews"},
    {label:"Disputes & Reports",href:"/admin/disputes",count:disputes,active:["/admin/disputes","/admin/reports","/admin/messages"].includes(path)},
    {label:"Activity & Audit Logs",href:"/admin/audit",active:path==="/admin/audit"},
    {label:"Settings & Operations",href:"/admin/operations",active:path==="/admin/operations"},
  ];
  return <aside className="admin-sidebar"><p className="eyebrow">PLATFORM MANAGEMENT</p><nav aria-label="Admin navigation">{links.map(link=><Link key={link.label} href={link.href} aria-current={link.active?"page":undefined}><span>{link.label}</span>{!!link.count&&<span className="admin-nav-count">{link.count}</span>}{!link.active&&<NavigationPending/>}</Link>)}</nav><Link className="admin-return" href="/account"><ActionIcon name="logout"/>Your account</Link></aside>;
}
