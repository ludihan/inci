import PDFDocument from "pdfkit";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOADS_DIR } from "./uploads";
import pt from "@/dictionaries/pt.json";
import en from "@/dictionaries/en.json";
import type { Dict } from "./i18n";
import type { Complaint, ComplaintResponse, Ticket, TicketMessage } from "./types";
import { formatCpf, formatDateTime } from "./utils";

export interface ReportSections {
  summary: boolean;
  details: boolean;
  history: boolean;
  photos: boolean;
  assignee: boolean;
  requester: boolean;
}

export interface ReportOptions {
  lang: "pt" | "en";
  title?: string;
  filters?: string;
  sections: ReportSections;
  generatedBy?: string;
}

const PAGE_WIDTH = 595.28;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR = {
  zinc900: "#18181b",
  zinc700: "#3f3f46",
  zinc500: "#71717a",
  zinc400: "#a1a1aa",
  zinc100: "#f4f4f5",
  white: "#ffffff",
  green: "#059669",
  gray: "#71717a",
  blue: "#2563eb",
  amber: "#d97706",
};

function dict(lang: "pt" | "en"): Dict {
  return lang === "en" ? en : pt;
}
export function getReportDict(lang: "pt" | "en"): Dict {
  return dict(lang);
}

function ensure(doc: PDFKit.PDFDocument, needed: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function drawText(
  doc: PDFKit.PDFDocument,
  text: string,
  opts: {
    x?: number;
    font?: string;
    size?: number;
    color?: string;
    width: number;
  }
): void {
  doc
    .font(opts.font ?? "Helvetica")
    .fontSize(opts.size ?? 10)
    .fillColor(opts.color ?? COLOR.zinc900);
  const height = doc.heightOfString(text, { width: opts.width });
  ensure(doc, height + 4);
  doc.text(text, opts.x ?? MARGIN, doc.y, { width: opts.width, lineBreak: true });
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string): void {
  ensure(doc, 36);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLOR.zinc900);
  doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveTo(MARGIN, doc.y + 4).lineTo(MARGIN + CONTENT_WIDTH, doc.y + 4);
  doc.lineWidth(1).strokeColor(COLOR.zinc900).stroke();
  doc.y += 16;
}

function drawFieldRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  zebra: boolean
): void {
  const labelW = 150;
  const valueW = CONTENT_WIDTH - labelW - 16;
  doc.font("Helvetica").fontSize(10);
  const lineHeight = doc.currentLineHeight();
  const lines = Math.max(
    1,
    Math.ceil(doc.heightOfString(value || "", { width: valueW }) / lineHeight)
  );
  const height = lines * lineHeight + 10;

  ensure(doc, height + 4);
  const y = doc.y;

  doc.rect(MARGIN, y, CONTENT_WIDTH, height).fill(zebra ? COLOR.zinc100 : COLOR.white);
  doc.fillColor(COLOR.zinc500).font("Helvetica-Bold").fontSize(9.5);
  doc.text(label, MARGIN + 8, y + 5, { width: labelW - 12 });
  doc.fillColor(COLOR.zinc900).font("Helvetica").fontSize(10);
  doc.text(value || "—", MARGIN + labelW + 8, y + 5, {
    width: valueW - 4,
    lineBreak: true,
  });
  doc.y = y + height + 2;
}

function statusColor(status: string): string {
  if (status === "open") return COLOR.green;
  if (status === "in_progress") return COLOR.amber;
  return COLOR.gray;
}

function ticketStatusLabel(d: Dict, status: string): string {
  if (status === "open") return d.common.open;
  if (status === "in_progress") return d.common.inProgress;
  return d.common.closed;
}

function typeColor(type: string): string {
  return type === "it" ? COLOR.blue : COLOR.amber;
}

function senderName(
  dict: Dict,
  sender: "user" | "admin",
  senderName?: string,
  userLabel?: string
): string {
  if (sender === "admin") return senderName || dict.common.admin;
  return userLabel ?? dict.common.anonymous;
}

function messageActionLabel(
  messagesDict: { [k: string]: string },
  action: string
): string {
  if (action === "open") return messagesDict.created;
  if (action === "close") return messagesDict.closed;
  if (action === "assume") return messagesDict.assumed;
  if (action === "release") return messagesDict.released;
  return "";
}

async function drawMessageHistory(
  doc: PDFKit.PDFDocument,
  dict: Dict,
  messagesDict: { [k: string]: string },
  messages: (TicketMessage | ComplaintResponse)[],
  userLabel: string | undefined,
  photos: boolean,
  lang: "pt" | "en"
): Promise<void> {
  const contentWidth = CONTENT_WIDTH - 16;

  const buildBlock = (
    m: TicketMessage | ComplaintResponse
  ): { header: string; actionLabel: string; forwardText: string | null; bodyText: string | null; height: number } => {
    const sender = senderName(dict, m.sender, m.senderName, userLabel);
    const dateStr = formatDateTime(m.createdAt, lang);
    const header = `${dateStr} — ${sender}`;
    const actionLabel = messageActionLabel(messagesDict, m.action);
    const forwardText =
      m.action === "forward" && m.content
        ? `${messagesDict.forwardedTo}: ${m.content}`
        : null;
    const bodyText =
      m.action === "forward" ? null : m.content || null;

    doc.font("Helvetica-Bold").fontSize(9.5);
    let height = doc.heightOfString(header, { width: contentWidth });
    if (actionLabel) {
      doc.font("Helvetica").fontSize(8.5);
      height += doc.heightOfString(actionLabel, { width: contentWidth });
    }
    if (forwardText) {
      doc.font("Helvetica").fontSize(9.5);
      height += doc.heightOfString(forwardText, { width: contentWidth });
    } else if (bodyText) {
      doc.font("Helvetica").fontSize(10);
      height += doc.heightOfString(bodyText, { width: contentWidth });
    }
    return { header, actionLabel, forwardText, bodyText, height: height + 22 };
  };

  if (messages.length === 0) {
    sectionTitle(doc, dict.report.history);
    drawText(doc, dict.report.historyEmpty, {
      width: CONTENT_WIDTH,
      color: COLOR.zinc500,
      size: 10,
    });
    doc.y += 14;
    return;
  }

  const blocks = messages.map(buildBlock);
  ensure(doc, 36 + blocks[0].height);
  sectionTitle(doc, dict.report.history);

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const { header, actionLabel, forwardText, bodyText, height } = blocks[i];
    ensure(doc, height);

    drawText(doc, header, {
      x: MARGIN + 8,
      width: contentWidth,
      font: "Helvetica-Bold",
      size: 9.5,
      color: COLOR.zinc500,
    });
    if (actionLabel) {
      drawText(doc, actionLabel, {
        x: MARGIN + 8,
        width: contentWidth,
        size: 8.5,
        color: COLOR.zinc400,
      });
    }
    if (forwardText) {
      drawText(doc, forwardText, {
        x: MARGIN + 8,
        width: contentWidth,
        size: 9.5,
        color: COLOR.zinc700,
      });
    } else if (bodyText) {
      drawText(doc, bodyText, {
        x: MARGIN + 8,
        width: contentWidth,
        size: 10,
        color: COLOR.zinc900,
      });
    }
    if (photos && m.attachments.length > 0) {
      for (const att of m.attachments) {
        const label = att.kind === "video" ? dict.report.video : dict.report.photo;
        drawText(doc, `${label}: ${path.basename(att.path)}`, {
          x: MARGIN + 8,
          width: contentWidth,
          size: 8.5,
          color: COLOR.zinc400,
        });
        if (att.kind === "image") {
          await drawPhotos(doc, att.path);
        }
      }
    }
    doc.y += 12;
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y);
    doc.lineWidth(0.5).strokeColor(COLOR.zinc100).stroke();
    doc.y += 10;
  }
}

function getImageSize(
  buffer: Buffer,
  ext: string
): { width: number; height: number } | null {
  if (ext === "png") {
    if (buffer.length < 24) return null;
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  const sofMarkers = [
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ];
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (sofMarkers.includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

function drawPhotos(doc: PDFKit.PDFDocument, photoPath?: string): Promise<void> {
  if (!photoPath) return Promise.resolve();
  const name = path.basename(photoPath);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "jpg" && ext !== "jpeg" && ext !== "png") return Promise.resolve();

  const fullPath = path.join(UPLOADS_DIR, name);
  return readFile(fullPath)
    .then((buffer) => {
      const size = getImageSize(buffer, ext);
      if (!size) return;
      const ratio = Math.min(CONTENT_WIDTH / size.width, 320 / size.height, 1);
      const w = size.width * ratio;
      const h = size.height * ratio;
      ensure(doc, h + 24);
      doc.image(buffer, MARGIN, doc.y + 6, { width: w });
      doc.y += h + 24;
    })
    .catch(() => undefined);
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  dict: Dict,
  opts: ReportOptions,
  defaultTitle: string
): void {
  const title = opts.title?.trim() || defaultTitle;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(COLOR.zinc900);
  doc.text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });

  const metaParts: string[] = [];
  if (opts.generatedBy) {
    metaParts.push(`${dict.report.generatedBy}: ${opts.generatedBy}`);
  }
  metaParts.push(`${dict.report.generatedAt}: ${formatDateTime(new Date().toISOString(), opts.lang)}`);
  doc.font("Helvetica").fontSize(9).fillColor(COLOR.zinc500);
  doc.text(metaParts.join("  ·  "), MARGIN, doc.y + 4, { width: CONTENT_WIDTH });

  doc.y += 14;
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y);
  doc.lineWidth(1.5).strokeColor(COLOR.zinc900).stroke();
  doc.y += 18;
}

function drawFilters(doc: PDFKit.PDFDocument, dict: Dict, filters?: string): void {
  if (!filters) return;
  doc.font("Helvetica").fontSize(9.5).fillColor(COLOR.zinc700);
  doc.text(filters, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.y += 10;
}

function addFooters(doc: PDFKit.PDFDocument, totalPages: number): void {
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const num = String(i + 1);
    doc.font("Helvetica").fontSize(8).fillColor(COLOR.zinc400);
    doc.text(
      num,
      MARGIN + CONTENT_WIDTH - doc.widthOfString(num),
      doc.page.height - 32,
      { lineBreak: false }
    );
  }
}

function finish(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function newDocument(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: "A4",
    bufferPages: true,
    margins: { top: 48, bottom: 48, left: MARGIN, right: MARGIN },
  });
}

// ---- Tickets ----

export async function buildTicketsReport(
  tickets: Ticket[],
  opts: ReportOptions
): Promise<Buffer> {
  const d = dict(opts.lang);
  const doc = newDocument();

  drawHeader(doc, d, opts, d.report.ticketsTitle);
  drawFilters(doc, d, opts.filters);

  if (opts.sections.summary) {
    sectionTitle(doc, d.report.summary);
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const closed = tickets.filter((t) => t.status === "closed").length;
    const it = tickets.filter((t) => t.type === "it").length;
    const maint = tickets.length - it;
    const rows: [string, string, string][] = [
      [d.report.totalRecords, String(tickets.length), ""],
      [d.admin.dashboard.openTickets, String(open), ""],
      [d.admin.dashboard.inProgressTickets, String(inProgress), ""],
      [d.admin.dashboard.closedTickets, String(closed), ""],
      [d.ticket.fields.it, String(it), ""],
      [d.ticket.fields.maintenance, String(maint), ""],
    ];
    rows.forEach(([label, value], i) => drawFieldRow(doc, label, value, i % 2 === 1));
    doc.y += 10;
  }

  if (tickets.length === 0) {
    drawText(doc, d.report.noRecords, {
      width: CONTENT_WIDTH,
      size: 10,
      color: COLOR.zinc500,
    });
  }

  let index = 0;
  for (const ticket of tickets) {
    ensure(doc, 48);
    doc.y += 6;

    const headerY = doc.y;
    doc.rect(MARGIN, headerY, CONTENT_WIDTH, 24).fill(COLOR.zinc100);
    doc.fillColor(COLOR.zinc900).font("Helvetica-Bold").fontSize(11);
    doc.text(ticket.id, MARGIN + 8, headerY + 6, { width: CONTENT_WIDTH - 200 });
    doc.font("Helvetica").fontSize(9.5);
    doc.fillColor(typeColor(ticket.type));
    doc.text(d.ticket.fields[ticket.type], MARGIN + CONTENT_WIDTH - 190, headerY + 7, {
      width: 70,
      align: "left",
    });
    doc.fillColor(statusColor(ticket.status));
    doc.text(
      ticketStatusLabel(d, ticket.status),
      MARGIN + CONTENT_WIDTH - 112,
      headerY + 7,
      { width: 104, align: "right" }
    );
    doc.y = headerY + 26;

    if (opts.sections.details) {
      const fields: [string, string][] = [
        [d.report.subject, ticket.subject],
        [d.report.placeLabel, ticket.place?.name ?? "—"],
        [d.report.statusLabel, ticketStatusLabel(d, ticket.status)],
        [d.report.created, formatDateTime(ticket.createdAt, opts.lang)],
        [d.report.updated, formatDateTime(ticket.updatedAt, opts.lang)],
      ];
      if (opts.sections.requester) fields.push([d.report.requester, formatCpf(ticket.cpf)]);
      if (opts.sections.assignee) fields.push([d.report.assignee, ticket.assignedToName ?? d.admin.unassigned]);
      fields.forEach(([label, value], i) => drawFieldRow(doc, label, value, i % 2 === 1));
      doc.y += 6;
    }

    if (opts.sections.history) {
      await drawMessageHistory(
        doc,
        d,
        d.ticket.messages,
        ticket.messages,
        d.common.requester,
        opts.sections.photos,
        opts.lang
      );
    }

    index += 1;
    if (index < tickets.length) {
      ensure(doc, 16);
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y);
      doc.lineWidth(1).strokeColor(COLOR.zinc100).stroke();
      doc.y += 14;
    }
  }

  const range = doc.bufferedPageRange();
  addFooters(doc, range.start + range.count);
  return finish(doc);
}

// ---- Complaints ----

export async function buildComplaintsReport(
  complaints: Complaint[],
  opts: ReportOptions
): Promise<Buffer> {
  const d = dict(opts.lang);
  const doc = newDocument();

  drawHeader(doc, d, opts, d.report.complaintsTitle);
  drawFilters(doc, d, opts.filters);

  if (opts.sections.summary) {
    sectionTitle(doc, d.report.summary);
    const open = complaints.filter((c) => c.status === "open").length;
    const closed = complaints.length - open;
    const rows: [string, string][] = [
      [d.report.totalRecords, String(complaints.length)],
      [d.admin.dashboard.openComplaints, String(open)],
      [d.admin.dashboard.closedComplaints, String(closed)],
    ];
    rows.forEach(([label, value], i) => drawFieldRow(doc, label, value, i % 2 === 1));
    doc.y += 10;
  }

  if (complaints.length === 0) {
    drawText(doc, d.report.noRecords, {
      width: CONTENT_WIDTH,
      size: 10,
      color: COLOR.zinc500,
    });
  }

  let index = 0;
  for (const complaint of complaints) {
    ensure(doc, 48);
    doc.y += 6;

    const headerY = doc.y;
    doc.rect(MARGIN, headerY, CONTENT_WIDTH, 24).fill(COLOR.zinc100);
    doc.fillColor(COLOR.zinc900).font("Helvetica-Bold").fontSize(11);
    doc.text(complaint.code, MARGIN + 8, headerY + 6, { width: CONTENT_WIDTH - 96 });
    doc.font("Helvetica").fontSize(9.5);
    doc.fillColor(statusColor(complaint.status));
    doc.text(
      complaint.status === "open" ? d.common.open : d.complaint.closed,
      MARGIN + CONTENT_WIDTH - 40,
      headerY + 7,
      { width: 40, align: "right" }
    );
    doc.y = headerY + 26;

    if (opts.sections.details) {
      const fields: [string, string][] = [
        [d.report.subject, complaint.subject],
        [d.report.content, complaint.content],
        [d.report.placeLabel, complaint.place?.name ?? "—"],
        [d.report.statusLabel, complaint.status === "open" ? d.common.open : d.complaint.closed],
        [d.report.created, formatDateTime(complaint.createdAt, opts.lang)],
        [d.report.updated, formatDateTime(complaint.updatedAt, opts.lang)],
      ];
      if (opts.sections.assignee) fields.push([d.report.assignee, complaint.assignedToName ?? d.admin.unassigned]);
      fields.forEach(([label, value], i) => drawFieldRow(doc, label, value, i % 2 === 1));
      doc.y += 6;
    }

    if (opts.sections.photos && complaint.attachments.length > 0) {
      for (const att of complaint.attachments) {
        const label = att.kind === "video" ? d.report.video : d.report.photo;
        drawText(doc, `${label}: ${path.basename(att.path)}`, {
          width: CONTENT_WIDTH,
          size: 8.5,
          color: COLOR.zinc400,
        });
        if (att.kind === "image") {
          await drawPhotos(doc, att.path);
        }
      }
    }

    if (opts.sections.history) {
      await drawMessageHistory(
        doc,
        d,
        d.complaint.messages,
        complaint.responses,
        undefined,
        opts.sections.photos,
        opts.lang
      );
    }

    index += 1;
    if (index < complaints.length) {
      ensure(doc, 16);
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y);
      doc.lineWidth(1).strokeColor(COLOR.zinc100).stroke();
      doc.y += 14;
    }
  }

  const range = doc.bufferedPageRange();
  addFooters(doc, range.start + range.count);
  return finish(doc);
}
