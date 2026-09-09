import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getDict, hasLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/store";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return {
    title: `${dict.appName} · ${dict.tagline}`,
    description: dict.appDescription,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18181b",
};

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang: locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDict();
  const settings = await getSettings();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeProvider>
          <Nav dict={dict} lang={locale} logo={settings.logoPath} />
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <p>
              {dict.appName} · {dict.tagline}
            </p>
            <p className="mt-2 flex items-center justify-center gap-3">
              <Link
                href={`/${locale}/privacy`}
                className="hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                {dict.nav.privacy}
              </Link>
              <span aria-hidden>·</span>
              <Link
                href={`/${locale}/terms`}
                className="hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                {dict.nav.terms}
              </Link>
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
