import { AccountShell } from "@/components/ui/account-shell";
import {
  NotificationCard,
  type Notification,
} from "@/features/privacy/privacy-forms";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
export default async function NotificationsPage() {
  await requireUser("/account/notifications");
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_notifications");
  if (error) throw new Error("Notifications unavailable");
  const rows = data as Notification[];
  return (
    <AccountShell>
      <h1>Your notifications</h1>
      <p>
        Recent private activity: verification, claims, representative replies
        and moderation. The latest 100 notifications are shown.
      </p>
      {!rows.length && <p>No notifications yet.</p>}
      {rows.map((n) => (
        <NotificationCard key={n.id} notification={n} />
      ))}
      <p>
        <a href="/account">Back to your account</a>
      </p>
    </AccountShell>
  );
}
