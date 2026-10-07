import { AccountFrame } from "./account-frame";
import { SiteHeader } from "./site-header";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <AccountFrame header={<SiteHeader />}>{children}</AccountFrame>
  );
}
