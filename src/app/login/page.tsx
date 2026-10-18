import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import { authConfigured } from "@/lib/auth";

// Dynamic so the Google client id is read at runtime: a static page would bake in whatever the env
// looked like at build time, and silently drop the Google button if the id was added afterwards.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create an account to track which Pokémon cards you own and what they are worth.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "register" ? "register" : "signin";
  const next = params.next && params.next.startsWith("/") ? params.next : "/account";
  const configured = authConfigured();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-10 sm:px-5 sm:py-14">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "register" ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Track the cards you own, and see what your collection is worth at today&apos;s TCGplayer market prices.
        </p>

        <div className="mt-6 rounded-xl border border-line bg-panel p-5 shadow-sm">
          {!configured && (
            <p className="mb-4 rounded-lg border border-poke-gold/40 bg-poke-gold/10 px-3 py-2 text-[13px] text-poke-gold">
              Accounts are not configured on this server yet (AUTH_SECRET is missing), so sign-in will fail.
            </p>
          )}
          <LoginForm initialMode={mode} next={next} googleClientId={process.env.GOOGLE_CLIENT_ID ?? ""} />
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          Passwords are hashed with scrypt; sessions are signed HttpOnly cookies. We never see your Google password.
        </p>
      </div>
    </div>
  );
}
