import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "404",
};

// Rendered for URLs that match no route at all. It bypasses the [lang] root
// layout, so it carries its own <html>/<body> and pulls in globals.css.
export default function GlobalNotFound() {
  return (
    <html lang="pt" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 -z-10 mx-auto h-32 w-32 rounded-full bg-zinc-900/10 blur-2xl dark:bg-zinc-100/10"
            />
            <p className="text-7xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              404
            </p>
          </div>
          <h1 className="mt-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Página não encontrada
          </h1>
          <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            O endereço acessado não existe ou foi movido. Verifique o link ou
            volte ao início.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Voltar ao início
            </Link>
            <Link
              href="/pt/track/ticket"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Acompanhar chamado
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
