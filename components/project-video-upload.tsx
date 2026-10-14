"use client";

import { useState, useTransition } from "react";
import { Film, Upload } from "lucide-react";
import { registerProjectVideoEvidence } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 100 * 1024 * 1024;
const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime"];

export function ProjectVideoUpload({ projectId }: { projectId: string }) {
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(formData: FormData) {
    setMessage(""); setError(false);
    const file = formData.get("video");
    const title = String(formData.get("title") ?? "").trim();
    if (!(file instanceof File) || file.size === 0) { setError(true); setMessage("Choose a video first."); return; }
    if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) { setError(true); setMessage("Use an MP4, WebM, or MOV video no larger than 100 MB."); return; }
    if (title.length < 3 || title.length > 120) { setError(true); setMessage("Add a short title (3–120 characters)."); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const filePath = `${projectId}/${crypto.randomUUID()}.${ext}`;
    setMessage("Uploading your video…");
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from("project-evidence").upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) { setError(true); setMessage(uploadError.message); return; }
    startTransition(async () => {
      const result = await registerProjectVideoEvidence({ projectId, filePath, title });
      if (result.error) { setError(true); setMessage(result.error); return; }
      setMessage("Video added to your private project evidence.");
      window.location.reload();
    });
  }
  return <form action={submit} className="project-video-form"><label>Video title<input name="title" minLength={3} maxLength={120} required placeholder="Prototype walkthrough or solution idea"/></label><label className="video-file-label"><Film size={17}/><span>Choose a video <small>MP4, WebM, or MOV · up to 100 MB · phone recording supported</small></span><input name="video" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" capture="environment" required/></label><button className="button" type="submit" disabled={busy}><Upload size={15}/>{busy ? "Saving…" : "Upload walkthrough"}</button>{message && <p className={error ? "form-error" : "success-note"} role="status">{message}</p>}</form>;
}
