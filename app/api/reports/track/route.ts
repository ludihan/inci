import { getTicketById } from "@/lib/store";
import { getCompany } from "@/lib/company";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { onlyDigits } from "@/lib/utils";

// Public per-ticket Ordem de Serviço download for the requester. Guarded by a
// matching CPF and rate-limited by IP.
export async function GET(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`report-track:${ip}`, 20, 60_000)) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") ?? "").trim();
  const cpf = onlyDigits(searchParams.get("cpf") ?? "");
  const lang = searchParams.get("lang") === "en" ? "en" : "pt";

  if (!id || cpf.length !== 11) {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }

  const ticket = await getTicketById(id);
  if (!ticket || onlyDigits(ticket.cpf) !== cpf) {
    return Response.json({ error: "not-found" }, { status: 404 });
  }

  const company = await getCompany();
  const buffer = await (
    await import("@/lib/reports")
  ).buildTicketOsReport(ticket, company, lang);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ticket.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
