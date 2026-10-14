import { AccountFrame } from "@/components/ui/account-frame";
import { SignOutForm } from "@/features/accounts/forms";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
export default async function SuspendedPage() {
  if (!(await getVerifiedUser())) redirect("/sign-in");
  const { data: reason } = await (await createDatabaseClient()).rpc("get_my_suspension_reason");
  return <AccountFrame><section className="dashboard-card boundary-card"><h1>Your account is suspended.</h1><p>Platform changes are disabled following an administrative decision. You can continue browsing public property profiles.</p>{reason&&<p className="action-feedback feedback-warning"><strong>Reason:</strong> {reason}</p>}<div className="review-actions"><a className="review-action" href="/search">Explore properties</a><SignOutForm/></div></section></AccountFrame>;
}
