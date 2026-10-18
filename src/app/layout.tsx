import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getStats } from "@/lib/data";
import PokeBall from "@/components/PokeBall";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// No route segment config here on purpose: `export const dynamic = "force-dynamic"` in a layout
// forces every route in the subtree to re-render per request, silently defeating the revalidate
// settings on the pages below.
export const metadata: Metadata = {
  title: {
    default: "Carddex — every Pokémon card, in every language, with prices",
    template: "%s · Carddex",
  },
  description:
    "The whole Pokémon TCG single-card catalogue with a language-independent identity: every card named in English, French, German, Spanish, Italian and Portuguese, with daily prices in USD (TCGplayer) and EUR (Cardmarket).",
  metadataBase: new URL("https://pokemon.laserraptorai.duckdns.org"),
  openGraph: {
    title: "Carddex — every Pokémon card, in every language, with prices",
    description:
      "28,000+ Pokémon cards, one identity per card, six printed names, USD and EUR prices from the marketplaces themselves.",
    type: "website",
  },
};

/**
 * Runs before first paint. Default is light; only a stored "dark" (or
 * "system" on a dark OS) turns the `.dark` class on, so the page never
 * flashes the wrong theme.
 */
const THEME_INIT = `(function(){try{var m=localStorage.getItem("carddex-theme");if(m!=="light"&&m!=="dark"&&m!=="system")m="light";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const stats = getStats();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-5">
              <Link prefetch={false} href="/" className="flex items-center gap-2.5" aria-label="Carddex home">
                <PokeBall className="h-8 w-8 flex-none drop-shadow-sm" />
                <span className="text-[15px] font-semibold tracking-tight">
                  Card<span className="text-poke-red">dex</span>
                </span>
              </Link>
              <nav className="ml-2 hidden items-center gap-1 text-sm text-muted sm:flex">
                <Link prefetch={false}
                  href="/"
                  className="rounded-md px-2.5 py-1.5 transition hover:bg-raised hover:text-fg"
                >
                  Catalogue
                </Link>
                <Link prefetch={false}
                  href="/sets"
                  className="rounded-md px-2.5 py-1.5 transition hover:bg-raised hover:text-fg"
                >
                  Sets
                </Link>
                <Link prefetch={false}
                  href="/about"
                  className="rounded-md px-2.5 py-1.5 transition hover:bg-raised hover:text-fg"
                >
                  About
                </Link>
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden text-[11px] leading-tight text-muted md:block md:text-right">
                  <div className="font-medium text-fg/90">
                    {stats ? `${stats.cards.toLocaleString("en-US")} cards · ${stats.sets} sets` : "28,000+ cards"}
                  </div>
                  <div>6 print languages · USD &amp; EUR prices, daily</div>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line/80 bg-surface/60">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-1.5 px-3 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p>
                Prices from TCGplayer (USD, via TCGCSV dumps) and Cardmarket (EUR, via
                their public price guide) · card text and scans in six languages from
                TCGdex (MIT) · not affiliated with Nintendo, Creatures or The Pokémon
                Company.
              </p>
              <p className="flex gap-3">
                <Link prefetch={false} href="/sets" className="hover:text-fg">
                  Sets
                </Link>
                <Link prefetch={false} href="/about#languages" className="hover:text-fg">
                  Languages
                </Link>
                <Link prefetch={false} href="/about" className="hover:text-fg">
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
