"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyTeamInviteLink({ teamId }: { teamId: string }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${typeof window === "undefined" ? "" : window.location.origin}/teams/${teamId}/join`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      const field = document.createElement("textarea");
      field.value = inviteUrl;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copiedToClipboard = document.execCommand("copy");
      field.remove();
      setCopied(copiedToClipboard);
      if (copiedToClipboard) window.setTimeout(() => setCopied(false), 2200);
    }
  }

  return <button type="button" className="button secondary-button invite-copy-button" onClick={copyLink} aria-live="polite">
    {copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Invite link copied" : "Copy invite link"}
  </button>;
}
