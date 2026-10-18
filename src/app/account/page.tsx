import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountClient from "@/components/AccountClient";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getUser } from "@/lib/accounts";
import { buildCollection } from "@/lib/collection";
import { getStats } from "@/lib/data";

/**
 * Per-user page, so this one route is dynamic on purpose — and it is safe: page-level
 * `force-dynamic` only affects /account. (A layout-level one is what killed caching everywhere
 * before the c68bb63 fix.)
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My collection",
  description: "The Pokémon cards you own, and what they are worth at today's TCGplayer market prices.",
  robots: { index: false, follow: false },
};

const PAGE = 100;

export default async function AccountPage() {
  const store = await cookies();
  const userId = verifySession(store.get(SESSION_COOKIE)?.value);
  const user = userId ? await getUser(userId) : undefined;
  if (!user) redirect("/login?next=/account");

  const view = await buildCollection(user.id, { sort: "value", offset: 0, limit: PAGE });

  return (
    <AccountClient
      email={user.email}
      name={user.name ?? null}
      initialTotals={{ ...view.totals, snapshot: getStats()?.snapshot ?? null }}
      initialLines={view.lines}
      initialCount={view.matchedCount}
    />
  );
}
