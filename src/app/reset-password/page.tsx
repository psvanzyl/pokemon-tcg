import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordCard } from "@/components/ResetPasswordCard";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Pokédex account using the link from your email.",
  robots: { index: false, follow: false },
};

// Thin server page; the card reads ?token= client-side (Suspense satisfies Next's
// useSearchParams rule). A GET never consumes a token, so a mail-client prefetch of the
// link cannot burn it — only the POST from the form does.
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-10 sm:px-5 sm:py-14">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">New password</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Choose a new password for your account. You&apos;ll be signed in straight after.
        </p>
        <div className="mt-6 rounded-xl border border-line bg-panel p-5 shadow-sm">
          <Suspense fallback={null}>
            <ResetPasswordCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
