import type { Metadata } from "next";
import { getStats } from "@/lib/data";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "About & method",
  description: "Where the card data and prices come from, how often they refresh, and what the numbers mean.",
};

export default function AboutPage() {
  const stats = getStats();
  return (
    <div className="mx-auto w-full max-w-[820px] px-3 py-6 sm:px-5">
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">About &amp; method</h1>

      <div className="mt-4 space-y-5 text-[14px] leading-relaxed text-muted">
        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">What this is</h2>
          <p>
            A complete index of the English Pokémon Trading Card Game singles catalogue:{" "}
            {stats?.cards.toLocaleString("en-US") ?? "28,000+"} cards across{" "}
            {stats?.sets ?? 220} sets, with the current market price of every print variant.
            Search it, filter it, sort it — no account, no paywall.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">Where the data comes from</h2>
          <p>
            Card metadata (name, set, card number, rarity, type, HP, stage) and images come
            from the TCGplayer catalogue, pulled through{" "}
            <a
              className="text-fg underline decoration-line-strong hover:decoration-poke-red"
              href="https://tcgcsv.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              TCGCSV
            </a>
            , which republishes TCGplayer&apos;s daily product and price dumps as open JSON.
            No scraping, no API key, no rate-limit games.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">How the prices work</h2>
          <p>
            All prices are in <strong className="text-fg">US dollars</strong> and come
            from TCGplayer&apos;s marketplace aggregates for each print variant:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="text-fg">Market</span> — TCGplayer&apos;s own weighted
              recent-sales figure. This is the headline number on every card.
            </li>
            <li>
              <span className="text-fg">Low / Mid / High</span> — the cheapest, median
              and most expensive listing currently on the marketplace.
            </li>
            <li>
              The price shown in the catalogue is the <em>cheapest market price</em> across a
              card&apos;s print variants, so a Reverse Holofoil-only bargain still surfaces. Where
              TCGplayer reports no market price at all, the card falls back to its mid price and
              the card page says so.
            </li>
            <li>
              A daily snapshot of every card is stored, which is what the price-history chart
              on each card page is built from.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">Freshness</h2>
          <p>
            The catalogue is rebuilt from the source dumps once a day. Current snapshot:{" "}
            <span className="text-fg">{stats?.snapshot ?? "—"}</span>
            {stats ? ` (${stats.priced.toLocaleString("en-US")} of ${stats.cards.toLocaleString("en-US")} cards priced)` : null}.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-[15px] font-semibold text-fg">Scope &amp; caveats</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Singles only — sealed product (booster boxes, ETBs, tins) is deliberately not
              listed.
            </li>
            <li>English-language printings only; Japanese and other Asian sets are not included.</li>
            <li>
              Prices are a marketplace aggregate, not an offer to sell. Graded slabs and
              condition grades are out of scope — every price is for a raw, near-mint copy as
              TCGplayer reports it.
            </li>
            <li>
              Not affiliated with, endorsed by or connected to Nintendo, Creatures Inc. or The
              Pokémon Company. Pokémon and all card names are trademarks of their respective
              owners; images are served from TCGplayer&apos;s CDN.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
