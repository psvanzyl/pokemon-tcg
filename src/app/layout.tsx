import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getStats } from "@/lib/data";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Carddex — every Pokémon card, with prices",
    template: "%s · Carddex",
  },
  description:
    "Search, filter and sort the complete English Pokémon TCG single-card catalogue: 28,000+ cards with daily TCGplayer market prices.",
  metadataBase: new URL("https://pokemon.laserraptorai.duckdns.org"),
  openGraph: {
    title: "Carddex — every Pokémon card, with prices",
    description:
      "28,000+ Pokémon cards with daily market prices. Search, filter and sort the whole English catalogue.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const stats = getStats();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink-950/85 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-5">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white/90 bg-gradient-to-b from-poke-red to-poke-red/70 text-[13px] font-black text-white shadow-inner">
                  <span className="grid h-3 w-3 place-items-center rounded-full border-2 border-white bg-ink-950" />
                </span>
                <span className="text-[15px] font-semibold tracking-tight">
                  Card<span className="text-poke-red">dex</span>
                </span>
              </Link>
              <nav className="ml-2 hidden items-center gap-1 text-sm text-muted sm:flex">
                <Link
                  href="/"
                  className="rounded-md px-2.5 py-1.5 transition hover:bg-ink-800 hover:text-slate-fg"
                >
                  Catalogue
                </Link>
                <Link
                  href="/sets"
                  className="rounded-md px-2.5 py-1.5 transition hover:bg-ink-800 hover:text-slate-fg"
                >
                  Sets
                </Link>
                <Link
                  href="/about"
                  className="rounded-md px-2.5 py-1.5 transition hover:bg-ink-800 hover:text-slate-fg"
                >
                  About
                </Link>
              </nav>
              <div className="ml-auto text-[11px] leading-tight text-muted sm:text-right">
                <div className="font-medium text-slate-fg/90">
                  {stats ? `${stats.cards.toLocaleString("en-US")} cards · ${stats.sets} sets` : "28,000+ cards"}
                </div>
                <div>USD market prices, refreshed daily</div>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-ink-700/80 bg-ink-900/60">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-1.5 px-3 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p>
                Prices from TCGplayer via TCGCSV daily dumps · USD · not affiliated
                with Nintendo, Creatures or The Pokémon Company.
              </p>
              <p className="flex gap-3">
                <Link href="/sets" className="hover:text-slate-fg">
                  Sets
                </Link>
                <Link href="/about" className="hover:text-slate-fg">
                  About &amp; method
                </Link>
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
