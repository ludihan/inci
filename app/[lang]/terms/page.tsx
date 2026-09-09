import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { getCompany } from "@/lib/company";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termos / Terms",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {children}
      </p>
    </section>
  );
}

export default async function TermsPage() {
  const locale = await getLocale();
  const company = await getCompany();
  const pt = locale === "pt";
  const controller =
    company.name ||
    (pt
      ? "o responsável pelo atendimento de chamados"
      : "the service desk operator");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
        {pt ? "Termos de Uso" : "Terms of Use"}
      </h1>

      <Section title={pt ? "1. Sobre o serviço" : "1. About the service"}>
        {pt
          ? `Este sistema permite abrir e acompanhar chamados de TI e manutenção junto a ${controller}.`
          : `This system lets you open and track IT and maintenance tickets with ${controller}.`}
      </Section>

      <Section title={pt ? "2. Uso permitido" : "2. Acceptable use"}>
        {pt
          ? "É proibido usar automação, varredura de CPFs ou qualquer tentativa de acessar chamados de terceiros. As informações prestadas devem ser verdadeiras."
          : "Automation, scanning of taxpayer IDs, or any attempt to access other people's tickets is prohibited. The information you provide must be truthful."}
      </Section>

      <Section title={pt ? "3. Área administrativa" : "3. Administrative area"}>
        {pt
          ? "O acesso à área administrativa é restrito a usuários autorizados e monitorado."
          : "Access to the administrative area is restricted to authorized users and is monitored."}
      </Section>

      <Section title={pt ? "4. Dados pessoais" : "4. Personal data"}>
        {pt
          ? "O tratamento de dados pessoais é descrito na "
          : "The processing of personal data is described in the "}
        <Link
          href={`/${locale}/privacy`}
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          {pt ? "Política de Privacidade" : "Privacy Policy"}
        </Link>
        .
      </Section>

      <Section title={pt ? "5. Alterações" : "5. Changes"}>
        {pt
          ? "Estes termos podem ser atualizados a qualquer momento; a versão vigente é sempre a publicada nesta página."
          : "These terms may be updated at any time; the version in force is always the one published on this page."}
      </Section>
    </div>
  );
}
