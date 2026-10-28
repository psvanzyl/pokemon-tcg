import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ScanClient from "@/components/ScanClient";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getUser } from "@/lib/accounts";

/** Logged-in only, so this route is dynamic on purpose. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scan cards",
  description: "Photograph your Pokémon cards and add them to your collection.",
  robots: { index: false, follow: false },
};

export default async function ScanPage() {
  const store = await cookies();
  const userId = verifySession(store.get(SESSION_COOKIE)?.value);
  const user = userId ? await getUser(userId) : undefined;
  if (!user) redirect("/login?next=/scan");

  return <ScanClient />;
}
