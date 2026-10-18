"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Me = {
  authenticated: boolean;
  user: { email: string; name: string | null } | null;
};

/**
 * Header account widget. Deliberately client-side: the header renders on statically cached pages,
 * and reading the session cookie in the layout would force every route in the app to be dynamic
 * (which is exactly the caching bug we just fixed). So it asks /api/auth/me after mount instead.
 */
export default function AccountMenu() {
  // Starts anonymous so the statically cached pages ship a visible Sign in / Sign up pair, then
  // swaps to the account menu if the session says otherwise.
  const [me, setMe] = useState<Me>({ authenticated: false, user: null });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = (await r.json()) as Me;
      setMe(j);
    } catch {
      setMe({ authenticated: false, user: null });
    }
  }, []);

  // Re-check on every navigation: the layout (and with it this widget) survives client-side route
  // changes, which is what left a stale "Sign in" in the header after signing in.
  const pathname = usePathname();
  useEffect(() => {
    void load();
  }, [load, pathname]);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  if (!me.authenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link
          prefetch={false}
          href="/login"
          className="rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-raised hover:text-fg"
        >
          Sign in
        </Link>
        <Link
          prefetch={false}
          href="/login?mode=register"
          className="rounded-md bg-poke-red px-2.5 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const label = me.user?.name || me.user?.email || "Account";

  return (
    <div className="flex items-center gap-2">
      <Link
        prefetch={false}
        href="/account"
        className="rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-raised hover:text-fg"
      >
        My collection
      </Link>
      <Link
        prefetch={false}
        href="/account"
        title={label}
        className="hidden max-w-[14rem] items-center gap-2 rounded-md border border-line-strong bg-panel px-2 py-1 text-[12px] text-fg sm:flex"
      >
        <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-poke-red text-[11px] font-semibold text-white">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate">{label}</span>
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="rounded-md px-2 py-1.5 text-[12px] text-muted transition hover:bg-raised hover:text-fg disabled:opacity-50"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
