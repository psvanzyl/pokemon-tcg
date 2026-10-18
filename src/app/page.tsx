import type { Metadata } from "next";
import Catalogue from "@/components/Catalogue";
import { getStats } from "@/lib/data";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Every Pokémon card, in every language, with prices",
};

export default function Home() {
  const stats = getStats();
  return (
    <>
      <section className="border-b border-line/70 bg-gradient-to-b from-surface to-canvas">
        <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 sm:py-6">
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
            The card, not the English card
          </h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
            Every card gets one language-independent identity, carrying the name it was
            printed under, its attack and effect text, and its scan in English, French,
            German, Spanish, Italian and Portuguese — with prices in dollars and euro.
            Search by any name it was printed under: “Charizard”, “Dracaufeu”, “Glurak”,
            “Caninos de Hisui”.{" "}
            {stats ? (
              <>
                <span className="text-fg">{stats.cards.toLocaleString("en-US")}</span>{" "}
                cards across {stats.sets} sets · last refresh {stats.snapshot}.
              </>
            ) : null}
          </p>
        </div>
      </section>
      <Catalogue />
    </>
  );
}
