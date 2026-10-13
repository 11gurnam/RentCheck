import Link from "next/link";
import { ManagementPage } from "@/features/admin-platform/management-page";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {return <><div className="review-actions admin-report-links"><Link className="review-action" href="/admin/reports">Review and photo reports</Link><Link className="review-action" href="/admin/messages">Message reports</Link><Link className="review-action" href="/admin/duplicates">Duplicate listings</Link></div><ManagementPage kind="cases" params={await searchParams}/></>;}
