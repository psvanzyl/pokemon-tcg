import type { Metadata } from "next";
import Catalogue from "@/components/Catalogue";
import { getStats } from "@/lib/data";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Every Pokémon card, with prices",
};

export default function Home() {
  const stats = getStats();
  return (
    <>
      <section className="border-b border-line/70 bg-gradient-to-b from-surface to-canvas">
        <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 sm:py-6">
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
            The complete English Pokémon card index
          </h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
            Every single card in the English Pokémon TCG catalogue with its current
            market price, searchable, filterable and sortable.{" "}
            {stats ? (
              <>
                <span className="text-fg">{stats.cards.toLocaleString("en-US")}</span>{" "}
                cards across {stats.sets} sets · prices in USD · last refresh{" "}
                {stats.snapshot}.
              </>
            ) : null}
          </p>
        </div>
      </section>
      <Catalogue />
    </>
  );
}
