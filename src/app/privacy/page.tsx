import { AccountShell } from "@/components/ui/account-shell";
import { EvidencePolicyPanel } from "@/features/privacy/evidence-policy";

export default async function Page() {
  return <AccountShell><EvidencePolicyPanel/></AccountShell>;
}
