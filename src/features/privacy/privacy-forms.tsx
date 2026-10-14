"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { ActionFeedback } from "@/components/ui/action-feedback";
import {
  recoverPassword,
  changePassword,
  deleteAccount,
  markNotificationRead,
} from "./privacy-actions";
export function RecoveryForm() {
  const [s, a, p] = useFeedbackAction(recoverPassword, {});
  return (
    <form action={a} className="auth-form">
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <button disabled={p}>Send recovery email</button>
      <ActionFeedback receipt={s} message={s.message} status={s.status}/>
    </form>
  );
}
export function PasswordForm() {
  const [s, a, p] = useFeedbackAction(changePassword, {});
  return (
    <form action={a} className="auth-form">
      <p>
        Confirm your identity by signing in or opening a recovery email within
        the last ten minutes.
      </p>
      <label>
        New password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </label>
      <button disabled={p}>Update password</button>
      <ActionFeedback receipt={s} message={s.message} status={s.status}/>
    </form>
  );
}
export function DeleteAccountForm() {
  const [s, a, p] = useFeedbackAction(deleteAccount, {});
  return (
    <form
      action={a}
      className="auth-form"
      onReset={(event) => event.preventDefault()}
    >
      <p>
        This permanently deletes your account, reviews, replies, tenancy
        records, uploaded photos, claims and evidence. Published property
        catalogue facts remain. Previous moderation decisions and their audit
        records are retained. Download access ends immediately. Stored files are
        deleted after closure; cleanup may finish later if storage is
        temporarily unavailable.
      </p>
      <p>
        Sign out and sign in again before deleting; identity confirmation must
        be within ten minutes.
      </p>
      <label>
        Deletion confirmation
        <input
          name="confirmation"
          autoComplete="off"
          required
          placeholder="DELETE MY ACCOUNT"
        />
      </label>
      <label>
        <input name="understood" type="checkbox" required />I understand this is
        permanent and audit records are retained.
      </label>
      <button disabled={p}>Delete my account permanently</button>
      <ActionFeedback receipt={s} message={s.message} status={s.status}/>
    </form>
  );
}
export type Notification = {
  id: string;
  kind: string;
  message: string;
  href: string;
  read_at: string | null;
  created_at: string;
};
export function NotificationCard({
  notification: n,
}: {
  notification: Notification;
}) {
  const [s, a, p] = useFeedbackAction(markNotificationRead, {});
  return (
    <article className="dashboard-card">
      <p>
        {n.read_at ? "Read" : "Unread"} ·{" "}
        {new Date(n.created_at).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}
      </p>
      <p>{n.message}</p>
      <a href={n.href}>Open related activity</a>
      {!n.read_at && (
        <form action={a}>
          <input type="hidden" name="notification" value={n.id} />
          <button disabled={p}>Mark as read</button>
        </form>
      )}
      <ActionFeedback receipt={s} message={s.message} status={s.status}/>
    </article>
  );
}
