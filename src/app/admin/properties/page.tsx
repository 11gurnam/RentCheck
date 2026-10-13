import { ManagementPage } from "@/features/admin-platform/management-page";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {return <ManagementPage kind="properties" params={await searchParams}/>;}
