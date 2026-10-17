import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { getCard, getCards, getSets, getStats } from "@/lib/data";
import PriceTable from "@/components/PriceTable";
import PriceChart from "@/components/PriceChart";
import CardTile from "@/components/CardTile";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

function numKey(num: string) {
  const m = num.match(/\d+/);
  return m ? parseInt(m[0], 10) : 99999;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = getCard(Number(id));
  if (!card) return { title: "Card not found" };
  const set = getSets().find((s) => s.id === card.set);
  return {
    title: `${card.n} — ${card.num}`,
    description: `${card.n} from ${set?.name ?? "the Pokémon TCG"}${
      card.rar ? ` (${card.rar})` : ""
    }. Market price ${money(card.px)}.`,
  };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) notFound();
  const card = getCard(numeric);
  if (!card) notFound();

  const sets = getSets();
  const set = sets.find((s) => s.id === card.set);
  const stats = getStats();
  const all = getCards();
  const siblings = all
    .filter((c) => c.set === card.set && c.id !== card.id)
    .sort(
      (a, b) => Math.abs(numKey(a.num) - numKey(card.num)) - Math.abs(numKey(b.num) - numKey(card.num)),
    )
    .slice(0, 12);

  const big = card.img.replace("_200w.jpg", "_400w.jpg");
  const meta: [string, string | null][] = [
    ["Set", set?.name ?? null],
    ["Card number", card.num],
    ["Rarity", card.rar],
    ["Type", card.typ],
    ["HP", card.hp],
    ["Stage", card.stg],
    ["Released", set?.released ?? null],
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        <Link href="/" className="hover:text-slate-fg">
          Catalogue
        </Link>
        <span>/</span>
        <Link href={`/?sets=${card.set}`} className="hover:text-slate-fg">
          {set?.name ?? `Set ${card.set}`}
        </Link>
        <span>/</span>
        <span className="text-slate-fg">{card.n}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[300px]">
          <img
            src={big}
            srcSet={`${card.img} 1x, ${big} 2x`}
            alt={card.n}
            className="w-full rounded-xl border border-ink-700 bg-ink-900 object-contain"
          />
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-center text-[13px] text-slate-fg transition hover:border-poke-red/60"
          >
            View on TCGplayer <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
            {card.n}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {set?.name ?? `Set ${card.set}`} · {card.num}
            {card.rar ? ` · ${card.rar}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2 rounded-xl border border-ink-700 bg-ink-850/60 p-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">
                Market price (USD)
              </div>
              <div className="text-[28px] font-semibold tabular-nums text-poke-gold">
                {money(card.px)}
              </div>
            </div>
            {card.pv.length > 1 && (
              <div className="text-[12px] text-muted">
                cheapest of {card.pv.length} print variants — see the table below
              </div>
            )}
            {stats && (
              <div className="ml-auto text-[11px] text-muted">
                snapshot {stats.snapshot}
              </div>
            )}
          </div>

          <section className="mt-5">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
              Prices by print
            </h2>
            <PriceTable variants={card.pv} />
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
              Price history
            </h2>
            <PriceChart id={card.id} start={stats?.snapshot ?? "today"} />
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
              Card details
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-ink-700 bg-ink-850/40 p-4 text-[13px] sm:grid-cols-3">
              {meta
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wider text-muted">{k}</dt>
                    <dd className="truncate text-slate-fg" title={v ?? ""}>
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold">
            More from {set?.name ?? `set ${card.set}`}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {siblings.map((c) => (
              <CardTile key={c.id} card={c} setName={set?.name ?? `Set ${c.set}`} view="grid" />
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: card.n,
            sku: `${set?.abbr || card.set}-${card.num}`,
            image: big,
            category: "Trading Card",
            brand: { "@type": "Brand", name: "Pokémon TCG" },
            offers: card.px
              ? {
                  "@type": "Offer",
                  price: card.px,
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                }
              : undefined,
          }),
        }}
      />
    </div>
  );
}
