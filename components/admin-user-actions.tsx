"use client";

import { useState } from "react";
import { banUser, deleteUserAccount, unbanUser, warnUser } from "@/app/actions";

export function AdminUserActions({
  userId,
  userName,
  canManageAccounts,
  isBanned,
  isDeleted,
}: {
  userId: string;
  userName: string;
  canManageAccounts: boolean;
  isBanned: boolean;
  isDeleted: boolean;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return <div className="admin-user-actions">
    <form action={warnUser} className="admin-user-action-form">
      <input type="hidden" name="target_user_id" value={userId}/>
      <label>Send a warning<textarea name="reason" required minLength={5} maxLength={1000} rows={3} placeholder="Write a clear, respectful explanation for this warning."/></label>
      <button className="button secondary-button" type="submit" disabled={isDeleted}>Send warning</button>
    </form>

    {!isDeleted && <form action={isBanned ? unbanUser : banUser} className="admin-user-action-form" onSubmit={(event) => {
      const action = isBanned ? "Lift this user's ban?" : "Ban this user from signing in?";
      if (!window.confirm(action)) event.preventDefault();
    }}>
      <input type="hidden" name="target_user_id" value={userId}/>
      <label>{isBanned ? "Reason for lifting the ban" : "Ban reason"}<textarea name="reason" required minLength={5} maxLength={1000} rows={2} placeholder="Add an internal moderation note."/></label>
      {!isBanned && <label>Ban duration<select name="duration" defaultValue="168h"><option value="24h">24 hours</option><option value="168h">7 days</option><option value="720h">30 days</option><option value="876000h">Permanent</option></select></label>}
      <button className="button secondary-button" type="submit" disabled={!canManageAccounts}>{isBanned ? "Lift ban" : "Ban account"}</button>
      {!canManageAccounts && <small className="admin-auth-setup-hint">Set the server-only SUPABASE_SERVICE_ROLE_KEY to manage Auth bans.</small>}
    </form>}

    {!isDeleted && <section className="admin-user-delete">
      <div><strong>Delete account</strong><p>This disables sign-in, replaces personal profile details with a deleted-member label, and preserves project records.</p></div>
      {!showDelete ? <button type="button" className="button danger-button" onClick={() => setShowDelete(true)} disabled={!canManageAccounts}>Delete account</button> : <form action={deleteUserAccount} className="admin-user-action-form" onSubmit={(event) => {
        if (!window.confirm(`Delete ${userName}'s account and redact the profile?`)) event.preventDefault();
      }}>
        <input type="hidden" name="target_user_id" value={userId}/>
        <label>Reason<textarea name="reason" required minLength={5} maxLength={1000} rows={2} placeholder="Required for the moderation record."/></label>
        <label>Type DELETE to confirm<input name="confirmation" required pattern="DELETE" autoComplete="off"/></label>
        <div className="admin-user-delete-actions"><button type="button" className="button secondary-button" onClick={() => setShowDelete(false)}>Cancel</button><button className="button danger-button" type="submit">Confirm account deletion</button></div>
      </form>}
      {!canManageAccounts && <small className="admin-auth-setup-hint">Set the server-only SUPABASE_SERVICE_ROLE_KEY to enable deletion.</small>}
    </section>}
  </div>;
}
