"use client";
/**
 * "Choose a new password" card for /reset-password?token=... (the email link target).
 * The token is spent only by the POST below — the GET of this page consumes nothing,
 * so a mail-client prefetch cannot burn the link.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export function ResetPasswordCard() {
  const token = useSearchParams().get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const raw = await r.text();
      let j: { message?: string } = {};
      try {
        j = raw ? (JSON.parse(raw) as { message?: string }) : {};
      } catch {
        j = {};
      }
      if (!r.ok) {
        setError(j.message || `That did not work (HTTP ${r.status}).`);
        return;
      }
      setDone(true);
      // Hard navigation so the header account widget sees the fresh session cookie.
      setTimeout(() => window.location.assign("/account"), 1200);
    } catch {
      setError("That did not work.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-[13px] text-muted">This link is incomplete. Request a new reset link from the sign-in page.</p>
        <Link href="/login" className="mt-3 inline-block text-[13px] text-poke-red underline">Back to sign in</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-[14px] text-fg">Password updated — you are signed in.</p>
        <Link href="/account" className="mt-3 inline-block text-[13px] text-poke-red underline">Go to your account</Link>
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-sm text-fg outline-none transition placeholder:text-muted/70 focus:border-poke-red/70 focus:ring-2 focus:ring-poke-red/20";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">New password</span>
        <input type="password" value={pw} minLength={8} required autoComplete="new-password"
          placeholder="at least 8 characters" onChange={(e) => setPw(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Confirm password</span>
        <input type="password" value={pw2} minLength={8} required autoComplete="new-password"
          placeholder="type it again" onChange={(e) => setPw2(e.target.value)} className={field} />
      </label>
      {error && <p className="text-[12.5px] text-poke-red">{error}</p>}
      <button type="submit" disabled={busy}
        className="mt-1 w-full rounded-lg bg-poke-red px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
