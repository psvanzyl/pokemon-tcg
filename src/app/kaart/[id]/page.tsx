import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { getCard, getCardContent, getCards, getSets, getStats, otherNames } from "@/lib/data";
import PriceTable from "@/components/PriceTable";
import EurPricesTable from "@/components/EurPricesTable";
import PriceChart from "@/components/PriceChart";
import CardTile from "@/components/CardTile";
import { LanguageChips, LocalisedCardText, LocalisedNames, availableLanguages } from "@/components/Languages";
import { eur, money } from "@/lib/format";
import { LANGS, LANG_LABEL, LANG_SHORT, type CardContent, type CardLanguage } from "@/lib/types";

export const revalidate = 600;

function resolveLang(raw: string | undefined, cardId: number): CardLanguage {
  if (!raw) return "en";
  const lang = raw.toLowerCase() as CardLanguage;
  if (lang === "en" || !LANGS.includes(lang)) return "en";
  const content = getCardContent(getCard(cardId));
  return content?.n?.[lang] ? lang : "en";
}

/** The euro figure to show next to the dollar headline: non-holo, else holo, else any. */
function headlineEur(content: CardContent | null): number | null {
  const fams = content?.eur ?? {};
  for (const key of ["standard", "holo", "reverse-holo", "1st-edition"]) {
    const v = fams[key]?.avg;
    if (v != null) return v;
  }
  for (const f of Object.values(fams)) if (f?.avg != null) return f.avg;
  return null;
}


// Declaring generateStaticParams is what makes a dynamic segment cache-eligible in Next 16: with
// it the first request renders (x-nextjs-cache: MISS) and every later request is a HIT with
// s-maxage=600, kept in .next/server/route-cache across restarts. Only a handful of ids are
// prerendered - the point is the mode, not the list. All 28,056 cards then cache on demand
// instead of shipping tens of thousands of HTML files (on the sibling app, prerendering 200 of
// 1,928 pages cost 179 MB of HTML per build). dynamicParams stays true, so an unknown id still
// renders on first request and 404s through notFound().
export function generateStaticParams() {
  return getCards().slice(0, 10).map((c) => ({ id: String(c.id) }));
}


function numKey(num: string) {
  const m = num.match(/\d+/);
  return m ? parseInt(m[0], 10) : 99999;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { lang: rawLang } = await searchParams;
  const card = getCard(Number(id));
  if (!card) return { title: "Card not found" };
  const set = getSets().find((s) => s.id === card.set);
  const content = getCardContent(card);
  const lang = resolveLang(rawLang, card.id);
  const localName = content?.n?.[lang];
  const locals = availableLanguages(content);
  const euro = headlineEur(content);
  const altName = localName && lang !== "en" ? ` (\u201c${localName}\u201d)` : "";
  return {
    title:
      localName && lang !== "en"
        ? `${localName} (${card.n}) — ${card.num}`
        : `${card.n} — ${card.num}`,
    description: `${card.n} from ${set?.name ?? "the Pokémon TCG"}${
      card.rar ? ` (${card.rar})` : ""
    }${altName}, printed in ${locals.length} language${locals.length === 1 ? "" : "s"}. USD ${
      money(card.px)
    }${euro != null ? ` · EUR ${eur(euro)}` : ""}.`,
    alternates: {
      canonical: `/kaart/${card.id}`,
      languages: Object.fromEntries(
        locals.map((l) => [l, l === "en" ? `/kaart/${card.id}` : `/kaart/${card.id}?lang=${l}`]),
      ),
    },
  };
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang: rawLang } = await searchParams;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) notFound();
  const card = getCard(numeric);
  if (!card) notFound();

  const lang = resolveLang(rawLang, card.id);
  const content = getCardContent(card);
  const locals = availableLanguages(content);
  const others = otherNames(content);
  const enName = content?.n?.en ?? card.n;
  const localName = content?.n?.[lang] ?? card.n;

  const sets = getSets();
  const set = sets.find((s) => s.id === card.set);
  const localSetName =
    (lang !== "en" ? set?.names?.[lang] : undefined) ?? set?.name ?? `Set ${card.set}`;
  const stats = getStats();
  const all = getCards();
  const siblings = all
    .filter((c) => c.set === card.set && c.id !== card.id)
    .sort(
      (a, b) => Math.abs(numKey(a.num) - numKey(card.num)) - Math.abs(numKey(b.num) - numKey(card.num)),
    )
    .slice(0, 12);

  const big = card.img.replace("_200w.jpg", "_400w.jpg");
  // Prefer the scan of the printing you asked for; TCGdex hosts them per language.
  const scan = lang !== "en" ? content?.imgs?.[lang] : undefined;
  const imgSrc = scan ? `${scan}/high.webp` : big;
  const imgSrcSet = scan
    ? `${scan}/low.webp 1x, ${scan}/high.webp 2x`
    : `${card.img} 1x, ${big} 2x`;
  const euro = headlineEur(content);

  // normalize.py takes the cheapest print-variant price and falls back to the
  // mid price when TCGplayer reports no market price for any variant. Label the
  // headline for the field it actually came from instead of always saying "market".
  const headline =
    card.pv.find((v) => (v.mkt ?? v.mid ?? v.low ?? v.high) === card.px) ?? card.pv[0];
  const headlineIsMarket = headline?.mkt != null;

  const meta: [string, string | null][] = [
    ["Set", localSetName],
    ["Card number", card.num],
    ["Rarity", card.rar],
    ["Illustrator", content?.i ?? null],
    ["National dex", content?.d != null ? `#${String(content.d).padStart(3, "0")}` : null],
    ["Type", card.typ],
    ["HP", card.hp],
    ["Stage", card.stg],
    ["Released", set?.released ?? null],
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        <Link prefetch={false} href="/" className="hover:text-fg">
          Catalogue
        </Link>
        <span>/</span>
        <Link prefetch={false} href={`/?sets=${card.set}`} className="hover:text-fg">
          {localSetName}
        </Link>
        <span>/</span>
        <span className="text-fg">{localName}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[300px]">
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            alt={localName}
            className="w-full rounded-xl border border-line bg-surface object-contain"
          />
          {scan && (
            <p className="mt-1.5 text-center text-[11px] text-muted">
              {LANG_LABEL[lang]} printing · scan via TCGdex
            </p>
          )}
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-center text-[13px] text-fg transition hover:border-poke-red/60"
          >
            View on TCGplayer <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {content?.cm && (
            <a
              href={`https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(
                enName,
              )}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-center text-[13px] text-fg transition hover:border-poke-red/60"
            >
              View on Cardmarket <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
            {localName}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {localSetName} · {card.num}
            {card.rar ? ` · ${card.rar}` : ""}
            {lang !== "en" ? ` · ${LANG_LABEL[lang]} printing` : ""}
          </p>
          {lang !== "en" && enName !== localName && (
            <p className="mt-1 text-[13px] text-muted">
              English name: <span className="text-fg/90">{enName}</span>
            </p>
          )}
          {others.length > 0 && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              Also printed as{" "}
              {others.map((o, i) => (
                <span key={o.lang}>
                  {i > 0 ? " · " : ""}
                  <span className="font-mono text-[11px] text-muted">{LANG_SHORT[o.lang]}</span>{" "}
                  <Link
                    prefetch={false}
                    href={`/kaart/${card.id}?lang=${o.lang}`}
                    title={LANG_LABEL[o.lang]}
                    className={
                      o.lang === lang
                        ? "font-semibold text-fg"
                        : "text-fg/90 hover:text-fg hover:underline"
                    }
                  >
                    {o.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <div className="mt-3">
            <LanguageChips cardId={card.id} content={content} current={lang} />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2 rounded-xl border border-line bg-surface p-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">
                {headlineIsMarket ? "Market price (USD)" : "Mid price (USD)"}
              </div>
              <div className="text-[28px] font-semibold tabular-nums text-poke-gold">
                {money(card.px)}
              </div>
            </div>
            {euro != null && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted">
                  Cardmarket avg (EUR)
                </div>
                <div className="text-[28px] font-semibold tabular-nums text-poke-gold">
                  {eur(euro)}
                </div>
              </div>
            )}
            {!headlineIsMarket && card.px != null && (
              <div className="text-[12px] text-muted">
                TCGplayer reports no market price for this card — this is its mid price.
              </div>
            )}
            {card.pv.length > 1 && (
              <div className="text-[12px] text-muted">
                cheapest of {card.pv.length} print variants — see the tables below
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
              Prices by print (USD, TCGplayer)
            </h2>
            <PriceTable variants={card.pv} />
          </section>

          {content?.eur && (
            <section className="mt-5">
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
                Prices in euro (Cardmarket)
              </h2>
              <EurPricesTable
                prices={content.eur}
                searchName={enName}
                priceDay={stats?.eurPriceDay}
              />
            </section>
          )}

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
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line bg-surface p-4 text-[13px] sm:grid-cols-3">
              {meta
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wider text-muted">{k}</dt>
                    <dd className="truncate text-fg" title={v ?? ""}>
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>
            {!content && (
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                No localised printing matched for this card yet — it is priced and named
                from the marketplaces only.{" "}
                <Link prefetch={false} href="/about#languages" className="underline decoration-line-strong hover:decoration-poke-red">
                  How the multilingual layer works
                </Link>
                .
              </p>
            )}
            {content && locals.length > 1 && (
              <div className="mt-4">
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
                  Names in every printed language
                </h3>
                <LocalisedNames cardId={card.id} content={content} current={lang} />
              </div>
            )}
          </section>

          {content && (locals.length > 1 || content.a?.length || content.ab?.length) && (
            <section className="mt-5" id="languages">
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
                Card text{lang !== "en" ? ` in ${LANG_LABEL[lang]}` : ""}
              </h2>
              <p className="mb-3 max-w-[70ch] text-[12px] leading-relaxed text-muted">
                Attack names, effect text and flavour text as printed — pick a language
                above to read the same card as another market sees it.
              </p>
              <LocalisedCardText content={content} lang={lang} />
            </section>
          )}
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold">
            More from {localSetName}
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
            // Every printed name, machine-readable. This is the identity layer in
            // structured data: one product, six names, so a search for any of them
            // can land here.
            alternateName: others.map((o) => o.name),
            sku: `${set?.abbr || card.set}-${card.num}`,
            image: imgSrc,
            category: "Trading Card",
            brand: { "@type": "Brand", name: "Pokémon TCG" },
            offers: [
              card.px
                ? {
                    "@type": "Offer",
                    price: card.px,
                    priceCurrency: "USD",
                    availability: "https://schema.org/InStock",
                  }
                : null,
              euro != null
                ? {
                    "@type": "Offer",
                    price: euro,
                    priceCurrency: "EUR",
                    availability: "https://schema.org/InStock",
                  }
                : null,
            ].filter(Boolean),
          }),
        }}
      />
    </div>
  );
}
