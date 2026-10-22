"use client";

import { useState } from "react";
import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";

type Mode = "signin" | "register";

export default function LoginForm({
  initialMode = "signin",
  next = "/account",
  googleClientId = "",
}: {
  initialMode?: Mode;
  next?: string;
  googleClientId?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      // Read as text first so a non-JSON body (e.g. an empty 500) reports the status
      // instead of dying with "Unexpected end of JSON input".
      const raw = await r.text();
      let j: { message?: string; error?: string } = {};
      try {
        j = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
      } catch {
        j = {};
      }
      if (!r.ok) {
        if (j.error === "email_taken") {
          setError(j.message ?? "That email already has an account.");
          return;
        }
        throw new Error(j.message || `That did not work (HTTP ${r.status}).`);
      }
      setNotice(isRegister ? "Account created." : "Signed in.");
      // Hard navigation: the header account widget sits in the layout and has to see the new session
      // cookie immediately — a soft push left a stale "Sign in" button in the header.
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-sm text-fg outline-none transition placeholder:text-muted/70 focus:border-poke-red/70 focus:ring-2 focus:ring-poke-red/20";

  return (
    <div className="w-full max-w-md">
      <div className="mb-4 flex rounded-lg border border-line bg-surface p-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            !isRegister ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            isRegister ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">Password</span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? "at least 8 characters" : "your password"}
              className={`${field} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-2 my-auto h-6 rounded px-2 text-[11px] text-muted transition hover:bg-raised hover:text-fg"
            >
              {show ? "hide" : "show"}
            </button>
          </div>
        </label>

        {error && (
          <p className="rounded-lg border border-poke-red/40 bg-poke-red/10 px-3 py-2 text-[13px] text-poke-red">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-muted">{notice}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-poke-red px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Working…" : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>

      {googleClientId && (
        <>
          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <GoogleSignInButton clientId={googleClientId} next={next} />
        </>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-muted">
        {isRegister
          ? "No email confirmation in this version — your account is active immediately. Your collection is private to your account."
          : "Your collection is stored with your account and stays private."}{" "}
        <Link prefetch={false} href="/about" className="underline hover:text-fg">
          How this works
        </Link>
      </p>
    </div>
  );
}
