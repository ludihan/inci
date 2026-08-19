import { getCurrentAdmin, hasPermission, isSuperAdmin } from "@/lib/auth";
import { features } from "@/lib/features";
import { getReportDict, type ReportSections } from "@/lib/reports";
import { getDB, getPlaceById, hasAssignedComplaints } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

const DEFAULT_SECTIONS: ReportSections = {
  summary: true,
  details: true,
  history: true,
  photos: false,
  assignee: true,
  requester: true,
  signatures: true,
};

const SECTION_KEYS: (keyof ReportSections)[] = [
  "summary",
  "details",
  "history",
  "photos",
  "assignee",
  "requester",
  "signatures",
];

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportModule = searchParams.get("module");
  if (reportModule !== "tickets" && reportModule !== "complaints") {
    return Response.json({ error: "invalid-module" }, { status: 400 });
  }

  const lang = searchParams.get("lang") === "en" ? "en" : "pt";
  const d = getReportDict(lang);

  const status = searchParams.get("status");
  const statusFilter: string | undefined =
    status === "open" ||
    status === "closed" ||
    (reportModule === "tickets" && status === "in_progress")
      ? status
      : undefined;

  const type = searchParams.get("type");
  const typeFilter =
    type === "it" || type === "maintenance" ? type : undefined;

  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("from") ?? "")
    ? searchParams.get("from")!
    : undefined;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("to") ?? "")
    ? searchParams.get("to")!
    : undefined;

  const placeId = searchParams.get("placeId") || undefined;
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let sections: ReportSections;
  const rawSections = searchParams.getAll("sections").join(",");
  if (!rawSections) {
    sections = { ...DEFAULT_SECTIONS };
  } else {
    const selected = new Set(
      rawSections
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    sections = {
      summary: selected.has("summary"),
      details: selected.has("details"),
      history: selected.has("history"),
      photos: selected.has("photos"),
      assignee: selected.has("assignee"),
      requester: selected.has("requester"),
      signatures: selected.has("signatures"),
    };
  }
  if (!SECTION_KEYS.some((k) => sections[k])) {
    return Response.json({ error: "no-sections" }, { status: 400 });
  }

  const db = await getDB();

  const filterParts: string[] = [];
  if (from && to) {
    filterParts.push(
      `${d.report.period}: ${formatDateTime(`${from}T00:00:00`, lang)} — ${formatDateTime(`${to}T00:00:00`, lang)}`
    );
  } else if (from) {
    filterParts.push(
      `${d.report.period}: ${d.report.from} ${formatDateTime(`${from}T00:00:00`, lang)}`
    );
  } else if (to) {
    filterParts.push(
      `${d.report.period}: ${d.report.to} ${formatDateTime(`${to}T00:00:00`, lang)}`
    );
  }
  if (statusFilter) {
    const statusLabel =
      statusFilter === "open"
        ? d.common.open
        : statusFilter === "in_progress"
          ? d.common.inProgress
          : reportModule === "tickets"
            ? d.common.closed
            : d.complaint.closed;
    filterParts.push(`${d.report.statusLabel}: ${statusLabel}`);
  }
  if (placeId) {
    const place = await getPlaceById(placeId);
    if (place) filterParts.push(`${d.report.placeLabel}: ${place.name}`);
  }

  if (reportModule === "tickets") {
    const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
    const canMaintenance =
      hasPermission(admin, "maintenance") &&
      features.maintenanceTicketsEnabled;
    if (!canIT && !canMaintenance) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (typeFilter === "it" && !canIT) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (typeFilter === "maintenance" && !canMaintenance) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (typeFilter) {
      filterParts.push(
        `${d.report.typeLabel}: ${d.ticket.fields[typeFilter]}`
      );
    }
    const filters = filterParts.join("  ·  ");

    const tickets = db.tickets
      .filter((t) => {
        if (typeFilter && t.type !== typeFilter) return false;
        if (!typeFilter && !hasPermission(admin, t.type)) return false;
        if (statusFilter && t.status !== statusFilter) return false;
        if (from && t.createdAt.slice(0, 10) < from) return false;
        if (to && t.createdAt.slice(0, 10) > to) return false;
        if (placeId && t.place?.id !== placeId) return false;
        if (ids.length > 0 && !ids.includes(t.id)) return false;
        return true;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const isSingleTicket = ids.length === 1 && tickets.length === 1;
    if (isSingleTicket) sections = { ...sections, summary: false };

    const buffer = await (await import("@/lib/reports")).buildTicketsReport(
      tickets,
      {
        lang,
        title:
          searchParams.get("title") ||
          (isSingleTicket ? tickets[0].id : undefined),
        filters,
        sections,
        generatedBy: admin.name,
      }
    );
    return pdfResponse(buffer, `chamados-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (!features.complaintsEnabled) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const isSuper = isSuperAdmin(admin);
  if (!isSuper && !(await hasAssignedComplaints(admin.id))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const filters = filterParts.join("  ·  ");

  const complaints = db.complaints
    .filter((c) => {
      if (!isSuper && c.assignedToId !== admin.id) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (from && c.createdAt.slice(0, 10) < from) return false;
      if (to && c.createdAt.slice(0, 10) > to) return false;
      if (placeId && c.place?.id !== placeId) return false;
      if (ids.length > 0 && !ids.includes(c.id) && !ids.includes(c.code)) return false;
      return true;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const buffer = await (await import("@/lib/reports")).buildComplaintsReport(
    complaints,
    {
      lang,
      title: searchParams.get("title") || undefined,
      filters,
      sections,
      generatedBy: admin.name,
    }
  );
  return pdfResponse(buffer, `denuncias-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function pdfResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
