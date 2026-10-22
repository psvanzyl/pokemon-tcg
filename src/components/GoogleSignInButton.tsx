"use client";

import { useEffect, useRef, useState } from "react";

type GsiId = {
  initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

/**
 * "Continue with Google" via Google Identity Services. Google renders the button itself (we only
 * hand it a container), and the credential it returns is an ID token we verify server-side against
 * Google's JWKS — the browser is never trusted for identity.
 */
export default function GoogleSignInButton({ clientId, next = "/account" }: { clientId: string; next?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => setScriptReady(true);
    s.onerror = () => setError("Google sign-in could not load (script blocked?).");
    document.head.appendChild(s);
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !scriptReady || !box.current || !window.google?.accounts?.id) return;
    const gsi = window.google.accounts.id;
    gsi.initialize({
      client_id: clientId,
      callback: async (resp) => {
        if (!resp?.credential) return;
        setBusy(true);
        setError(null);
        try {
          const r = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: resp.credential }),
          });
          // Read the body as text first: if the server answered with an empty or non-JSON
          // body, `r.json()` throws "Unexpected end of JSON input" and swallows the real
          // status code and message.
          const raw = await r.text();
          let j: { message?: string } = {};
          try {
            j = raw ? (JSON.parse(raw) as { message?: string }) : {};
          } catch {
            j = {};
          }
          if (!r.ok) {
            throw new Error(j?.message || `Google sign-in failed (HTTP ${r.status}).`);
          }
          window.location.href = next;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Google sign-in failed.");
          setBusy(false);
        }
      },
    });
    gsi.renderButton(box.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 300,
    });
  }, [clientId, scriptReady, next]);

  return (
    <div className="flex flex-col items-stretch gap-2">
      <div ref={box} className="flex min-h-[44px] items-center justify-center" />
      {!scriptReady && !error && <p className="text-center text-[12px] text-muted">Loading Google sign-in…</p>}
      {busy && <p className="text-center text-[12px] text-muted">Signing you in…</p>}
      {error && <p className="text-center text-[12px] text-poke-red">{error}</p>}
    </div>
  );
}
