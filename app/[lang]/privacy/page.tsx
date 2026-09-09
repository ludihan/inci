import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/i18n";
import { getCompany } from "@/lib/company";
import { formatCnpj, formatPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacidade / Privacy",
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

export default async function PrivacyPage() {
  const locale = await getLocale();
  const company = await getCompany();
  const pt = locale === "pt";
  const controller =
    company.name ||
    (pt
      ? "o responsável pelo atendimento de chamados"
      : "the service desk operator");
  const address = [
    company.addressStreet,
    company.addressNumber,
    company.addressNeighborhood,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {pt ? "Política de Privacidade" : "Privacy Policy"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {pt
            ? "Esta política descreve como os dados pessoais informados ao abrir ou acompanhar um chamado são tratados, em conformidade com a Lei nº 13.709/2018 (LGPD)."
            : "This policy describes how the personal data you provide when opening or tracking a ticket is processed, in line with Brazil's data-protection law (LGPD, Law 13.709/2018)."}
        </p>
      </div>

      <Section title={pt ? "1. Controlador" : "1. Data controller"}>
        {controller}
        {company.cnpj ? ` (CNPJ ${formatCnpj(company.cnpj)})` : ""}
        {address ? `, ${address}` : ""}
        {company.phone ? `, ${formatPhone(company.phone)}` : ""}.
      </Section>

      <Section title={pt ? "2. Dados coletados" : "2. Data collected"}>
        {pt
          ? "Nome, CPF, telefone, cargo/função, descrição do problema, fotos anexadas, mensagens trocadas e, no encerramento, a assinatura de conclusão."
          : "Name, taxpayer ID (CPF), phone, role, a description of the problem, attached photos, messages exchanged, and, at closing, the completion signature."}
      </Section>

      <Section title={pt ? "3. Finalidade e base legal" : "3. Purpose and legal basis"}>
        {pt
          ? "Os dados são usados exclusivamente para registrar, executar e comprovar o atendimento do chamado, com base no legítimo interesse e na execução do serviço solicitado."
          : "The data is used solely to register, carry out and evidence the handling of the ticket, on the basis of legitimate interest and performance of the requested service."}
      </Section>

      <Section title={pt ? "4. Compartilhamento" : "4. Sharing"}>
        {pt
          ? "Os dados não são vendidos nem compartilhados com terceiros. Um cookie técnico de sessão é usado apenas para manter administradores autenticados."
          : "Data is not sold or shared with third parties. A technical session cookie is used only to keep administrators signed in."}
      </Section>

      <Section title={pt ? "5. Retenção" : "5. Retention"}>
        {pt
          ? "Os registros são mantidos enquanto necessários para fins de histórico e comprovação do atendimento."
          : "Records are kept for as long as needed for history and evidence of the service."}
      </Section>

      <Section title={pt ? "6. Direitos do titular" : "6. Your rights"}>
        {pt
          ? "Você pode solicitar confirmação, acesso, correção ou eliminação dos seus dados pelos canais de contato acima."
          : "You may request confirmation, access, correction or deletion of your data through the contact channels above."}
      </Section>

      <Section title={pt ? "7. Segurança" : "7. Security"}>
        {pt
          ? "O acesso administrativo é autenticado, os formulários públicos são protegidos contra automação e há limitação de taxa de requisições."
          : "Administrative access is authenticated, public forms are protected against automation, and request rate limiting is in place."}
      </Section>
    </div>
  );
}
