import type { Metadata } from "next";
import Link from "next/link";
import { getCards, getContent, getStats } from "@/lib/data";
import { LANGS, LANG_LABEL } from "@/lib/types";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "About & method",
  description:
    "Where the card data and prices come from: a language-independent card identity, six print languages, USD from TCGplayer and EUR from Cardmarket.",
};

/**
 * Pick a card to demonstrate the identity layer with — the one that started this
 * ("Caninos de Hisui", the French Hisuian Growlithe) if it is in the dataset, otherwise
 * whichever card carries the most printed names.
 */
function languageExample() {
  const content = getContent();
  const cards = getCards();
  for (const c of cards) {
    if (c.t && content[c.t]?.n?.fr === "Caninos de Hisui") return c;
  }
  let best: (typeof cards)[number] | null = null;
  let bestCount = 0;
  for (const c of cards) {
    const n = c.t ? Object.keys(content[c.t]?.n ?? {}).length : 0;
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return bestCount >= 3 ? best : null;
}

function pct(v: number | undefined) {
  if (v == null) return null;
  const p = v <= 1 ? v * 100 : v; // the merge writes a percentage, but tolerate a fraction
  return `${Math.round(p * 10) / 10}%`;
}

export default function AboutPage() {
  const stats = getStats();
  const content = getContent();
  const example = languageExample();
  const exampleContent = example?.t ? content[example.t] : null;
  const exampleNames = exampleContent
    ? LANGS.filter((l) => exampleContent.n?.[l]).map((l) => ({
        lang: l,
        name: exampleContent.n?.[l] as string,
      }))
    : [];

  return (
    <div className="mx-auto w-full max-w-[820px] px-3 py-6 sm:px-5">
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
        About &amp; method
      </h1>

      <div className="mt-4 space-y-5 text-[14px] leading-relaxed text-muted">
        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">What this is</h2>
          <p>
            The Pokémon TCG singles catalogue with something the marketplaces do not have: a{" "}
            <span className="text-fg">language-independent identity</span> for every card.
            TCGplayer and Cardmarket both model a card as an English product; a card printed in
            French, German, Spanish, Italian or Portuguese is then either invisible or listed as
            a shadow of the English one. Here, one card is one thing, and its printed names in
            every language hang off that single identity —{" "}
            {stats?.cards.toLocaleString("en-US") ?? "28,000+"} cards across{" "}
            {stats?.sets ?? 220} sets, priced in USD <em>and</em> EUR. No account, no paywall,
            no login wall to read a card name.
          </p>
        </section>

        <section id="languages">
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">
            Every card, in every printed language
          </h2>
          <p>
            Each card carries a stable identity that resolves to{" "}
            {LANGS.length} printings worth of content: the printed name, attack names, effect
            text, flavour text and the scan of the card as printed — not a translation we wrote,
            but the text that is on the cardboard in that market. The card page has a language
            switcher, so{" "}
            <span className="text-fg">/kaart/&lt;card&gt;?lang=fr</span> is a real French page
            you can link to and search engines can index separately.
          </p>
          {example && exampleNames.length > 1 && (
            <div className="mt-3 rounded-xl border border-line bg-surface p-3">
              <p className="text-[13px] text-fg">
                Worked example — the card that made the case for this:
              </p>
              <ul className="mt-2 space-y-0.5 text-[13px]">
                {exampleNames.map((e) => (
                  <li key={e.lang}>
                    <span className="mr-2 font-mono text-[11px] text-muted">
                      {e.lang.toUpperCase()}
                    </span>
                    <Link
                      prefetch={false}
                      className="text-fg underline decoration-line-strong hover:decoration-poke-red"
                      href={
                        e.lang === "en"
                          ? `/kaart/${example.id}`
                          : `/kaart/${example.id}?lang=${e.lang}`
                      }
                    >
                      {e.name}
                    </Link>
                    <span className="ml-2 text-muted">{LANG_LABEL[e.lang]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-muted">
                One card, one identity, {exampleNames.length} printed names. Searching any of
                them finds this page — including in the catalogue search, which falls back to
                the other five languages when an English query comes up empty.
              </p>
            </div>
          )}
          <p className="mt-2">
            {stats?.identityCards != null ? (
              <>
                Identity resolved for{" "}
                <span className="text-fg">
                  {stats.identityCards.toLocaleString("en-US")}
                </span>{" "}
                of the {stats.cards.toLocaleString("en-US")} products in the catalogue
                {pct(stats.identityCoverage) ? ` (${pct(stats.identityCoverage)})` : ""}. The
                rest are TCGplayer-only listings with no counterpart in any print-language
                source — World Championship decks, jumbo cards, prize packs — and they are shown
                as such rather than quietly dropped.
              </>
            ) : (
              <>Identity coverage is reported in the daily snapshot.</>
            )}
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">Where the data comes from</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <span className="text-fg">Card names, text, scans (6 languages)</span> —{" "}
              <a
                className="text-fg underline decoration-line-strong hover:decoration-poke-red"
                href="https://github.com/tcgdex/cards-database"
                target="_blank"
                rel="noopener noreferrer"
              >
                TCGdex
              </a>
              &apos;s open card database (MIT), cloned and parsed here. Community-maintained,
              with the printed text in each language rather than machine translation.
            </li>
            <li>
              <span className="text-fg">USD prices &amp; the product catalogue</span> —
              TCGplayer via{" "}
              <a
                className="text-fg underline decoration-line-strong hover:decoration-poke-red"
                href="https://tcgcsv.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                TCGCSV
              </a>
              , which republishes TCGplayer&apos;s daily product and price dumps as open JSON.
            </li>
            <li>
              <span className="text-fg">EUR prices</span> — Cardmarket&apos;s own public
              product catalogue and daily price guide downloads. No scraping, no API key, no
              rate-limit games for any of the three sources.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">
            How a card gets one identity
          </h2>
          <p>
            The strongest evidence first: a product&apos;s TCGplayer id is matched to the
            source card that already cites that same id. Where that fails, the card is matched
            on set plus card number with the name cross-checked — tolerating the decorative
            suffixes TCGplayer adds (<span className="text-fg">Electivire LV.X</span> vs{" "}
            <span className="text-fg">Electivire</span>, <span className="text-fg">Nidoran F</span>{" "}
            vs <span className="text-fg">Nidoran♀</span>) and the different zero-padding the two
            catalogues use (<span className="text-fg">082</span> vs{" "}
            <span className="text-fg">82</span>). Every join records which method resolved it, and
            unmatched products are counted and sampled in the daily report rather than silently
            discarded — that is how the coverage figure above stays honest.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">How the prices work</h2>
          <p>
            <span className="text-fg">US dollars</span>, from TCGplayer&apos;s marketplace
            aggregates for each print variant:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="text-fg">Market</span> — TCGplayer&apos;s own weighted
              recent-sales figure. This is the headline number on every card.
            </li>
            <li>
              <span className="text-fg">Low / Mid / High</span> — the cheapest, median and most
              expensive listing currently on the marketplace.
            </li>
            <li>
              The catalogue price is the <em>cheapest market price</em> across a card&apos;s
              print variants, so a Reverse Holofoil-only bargain still surfaces. Where TCGplayer
              reports no market price at all, the card falls back to its mid price and the card
              page says so.
            </li>
          </ul>
          <p className="mt-2">
            <span className="text-fg">Euros</span>, from Cardmarket&apos;s public price guide
            {stats?.eurPriced ? (
              <>
                {" "}
                ({stats.eurPriced.toLocaleString("en-US")} cards priced
                {stats.eurPriceDay ? `, guide dated ${stats.eurPriceDay.slice(0, 10)}` : ""})
              </>
            ) : null}
            : average, low, trend, 7-day and 30-day figures per Cardmarket product, shown on the
            card page next to the dollar table.
          </p>
          <p className="mt-2 rounded-xl border border-line bg-surface p-3 text-[13px]">
            <span className="text-fg">One honest limit.</span> Neither marketplace publishes
            prices per <em>print language</em> — Cardmarket&apos;s product list is one product
            per card, and we can measure that the same product carries the same euro figure for
            the English, French, German, Italian and Spanish printings. So the EUR numbers here
            are per card, not &ldquo;what a French copy costs&rdquo;. Listing-level,
            per-language pricing does not exist as open data anywhere; we show what does exist
            instead of inventing a split. Condition grades and graded slabs are out of scope the
            same way — every price is for a raw copy as the marketplace reports it.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">Freshness</h2>
          <p>
            The catalogue is rebuilt from the source dumps once a day. Current snapshot:{" "}
            <span className="text-fg">{stats?.snapshot ?? "—"}</span>
            {stats
              ? ` — ${stats.priced.toLocaleString("en-US")} of ${stats.cards.toLocaleString("en-US")} cards with a USD price`
              : null}
            {stats?.eurProducts
              ? `, EUR data on ${stats.eurProducts.toLocaleString("en-US")} Cardmarket products`
              : null}
            . A daily snapshot of every card is stored, which is what the price-history chart on
            each card page is built from.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">Open by default</h2>
          <p>
            The catalogue and the multilingual content are served from plain JSON endpoints, no
            key and no account:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="font-mono text-[12px] text-fg">/api/cards</span> — every card,
              its print variants and its identity id.
            </li>
            <li>
              <span className="font-mono text-[12px] text-fg">/api/lookup?q=</span> — the
              multilingual name search (accent- and punctuation-insensitive) behind the
              catalogue&apos;s fallback.
            </li>
          </ul>
          <p className="mt-2">
            The identity layer itself is the point: if another project wants to build on
            &ldquo;one card, six names&rdquo;, the mapping is here rather than locked behind
            the search box.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">
            What we deliberately do not build
          </h2>
          <p>
            Deck builders, card scanners, AI grading, price alerts, forums, VR binders. Those
            are crowded, expensive to run well, and none of them is the reason someone cannot
            find a card. The gap that is still open is the boring one: a card is a card in every
            language, and the prices should say which currency they are in and where they came
            from. That is what this is.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">Scope &amp; caveats</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Singles only — sealed product (booster boxes, ETBs, tins) is deliberately not
              listed.
            </li>
            <li>
              Western print languages: English, French, German, Spanish, Italian and Portuguese.
              Japanese and other Asian printings are not included.
            </li>
            <li>
              Coverage is not uniform and the numbers on this page are the real ones: names and
              card text are near-complete across the six languages, while a shop price exists for
              roughly half of all printings in either currency — cards that were never traded
              enough for a marketplace average simply have no price, in either currency.
            </li>
            <li>
              Not affiliated with, endorsed by or connected to Nintendo, Creatures Inc. or The
              Pokémon Company. Pokémon and all card names are trademarks of their respective
              owners; images are served from TCGplayer&apos;s CDN and TCGdex&apos;s asset host.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
