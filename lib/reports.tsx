/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer's <Image> is not an HTML <img> and has no alt prop */
import { readFile } from "fs/promises";
import path from "path";
import type { ReactNode } from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { UPLOADS_DIR } from "./uploads";
import pt from "@/dictionaries/pt.json";
import en from "@/dictionaries/en.json";
import type { Dict } from "./i18n";
import type {
  Complaint,
  ComplaintResponse,
  Ticket,
  TicketItemUsage,
  TicketMessage,
} from "./types";
import { formatCpf, formatCurrency, formatDateTime, formatPhone } from "./utils";

export interface ReportSections {
  summary: boolean;
  details: boolean;
  history: boolean;
  photos: boolean;
  assignee: boolean;
  requester: boolean;
  signatures: boolean;
}

export interface ReportOptions {
  lang: "pt" | "en";
  title?: string;
  filters?: string;
  sections: ReportSections;
  generatedBy?: string;
}

export interface TicketsTablePdfOptions {
  lang: "pt" | "en";
  title?: string;
  filters?: string;
  generatedBy?: string;
}

const COLOR = {
  zinc900: "#18181b",
  zinc700: "#3f3f46",
  zinc500: "#71717a",
  zinc400: "#a1a1aa",
  zinc200: "#e4e4e7",
  zinc100: "#f4f4f5",
  white: "#ffffff",
  green: "#059669",
  gray: "#71717a",
  blue: "#2563eb",
  amber: "#d97706",
};

// Tailwind -300 tints: rows stay distinguishable even printed, and black
// body text stays legible on top.
const TABLE_STATUS_TINT: Record<string, string> = {
  open: "#fca5a5",
  in_progress: "#fcd34d",
  closed: "#7dd3fc",
};
const TABLE_BORDER = "#a1a1aa";
const TABLE_MARGIN = 32;

function dict(lang: "pt" | "en"): Dict {
  return lang === "en" ? (en as Dict) : (pt as Dict);
}

export function getReportDict(lang: "pt" | "en"): Dict {
  return dict(lang);
}

// ---- helpers ----

function statusLabel(d: Dict, status: string): string {
  if (status === "open") return d.common.open;
  if (status === "in_progress") return d.common.inProgress;
  return d.common.closed;
}

function statusColor(status: string): string {
  if (status === "open") return COLOR.green;
  if (status === "in_progress") return COLOR.amber;
  return COLOR.gray;
}

function typeColor(type: string): string {
  return type === "it" ? COLOR.blue : COLOR.amber;
}

function messageActionLabel(
  messagesDict: Record<string, string>,
  action: string
): string {
  if (action === "open") return messagesDict.created;
  if (action === "close") return messagesDict.closed;
  if (action === "assume") return messagesDict.assumed;
  if (action === "release") return messagesDict.released;
  return "";
}

function formatDuration(fromIso: string, toIso: string): string {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return "—";
  const hours = Math.round((to - from) / (1000 * 60 * 60));
  return `${hours}h`;
}

function equipmentText(t: Ticket): string {
  const extra = [t.equipmentBrand, t.equipmentModel].filter(Boolean).join(" / ");
  if (!t.equipment && !extra) return "";
  return extra ? `${t.equipment} (${extra})`.trim() : t.equipment;
}

/**
 * Parses width/height straight from the file bytes so a corrupt upload is
 * dropped before it reaches the renderer instead of throwing mid-render.
 */
function imageSize(
  buffer: Buffer,
  ext: string
): { width: number; height: number } | null {
  if (ext === "png") {
    if (buffer.length < 24 || buffer[0] !== 0x89 || buffer[1] !== 0x50) return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  const sof = [
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
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
    if (sof.includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

async function loadImage(relPath?: string): Promise<Buffer | null> {
  if (!relPath) return null;
  const name = path.basename(relPath);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") return null;
  try {
    const buf = await readFile(path.join(UPLOADS_DIR, name));
    const size = imageSize(buf, ext);
    if (!size || size.width < 1 || size.height < 1) return null;
    return buf;
  } catch {
    return null;
  }
}

async function preloadImages(
  messageGroups: { attachments: { path: string; kind: string }[] }[],
  signaturePaths: (string | undefined)[],
  sections: ReportSections
): Promise<Map<string, Buffer>> {
  const map = new Map<string, Buffer>();
  const add = async (p?: string) => {
    if (!p || map.has(p)) return;
    const buf = await loadImage(p);
    if (buf) map.set(p, buf);
  };
  if (sections.signatures) {
    for (const p of signaturePaths) await add(p);
  }
  if (sections.history && sections.photos) {
    for (const m of messageGroups) {
      for (const a of m.attachments) {
        if (a.kind === "image") await add(a.path);
      }
    }
  }
  return map;
}

// ---- shared styles ----

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLOR.zinc900,
  },
  tablePage: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: TABLE_MARGIN,
    fontSize: 7,
    fontFamily: "Helvetica",
    color: COLOR.zinc900,
  },
  filters: { fontSize: 9.5, color: COLOR.zinc700, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  sectionRule: { borderBottomWidth: 1, borderColor: COLOR.zinc900, marginTop: 3 },
  fieldRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 8 },
  fieldLabel: {
    width: 150,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: COLOR.zinc500,
  },
  fieldValue: { flex: 1, fontSize: 10 },
  pageNumber: { position: "absolute", fontSize: 8, color: COLOR.zinc400 },
});

// ---- shared components ----

function Header({
  d,
  opts,
  defaultTitle,
}: {
  d: Dict;
  opts: Pick<ReportOptions, "lang" | "title" | "generatedBy">;
  defaultTitle: string;
}) {
  const meta = [
    opts.generatedBy && `${d.report.generatedBy}: ${opts.generatedBy}`,
    `${d.report.generatedAt}: ${formatDateTime(new Date().toISOString(), opts.lang)}`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <View>
      <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>
        {opts.title?.trim() || defaultTitle}
      </Text>
      <Text style={{ fontSize: 9, color: COLOR.zinc500, marginTop: 3 }}>{meta}</Text>
      <View
        style={{ borderBottomWidth: 2, borderColor: COLOR.zinc900, marginTop: 8 }}
      />
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <View style={{ marginTop: 4, marginBottom: 8 }} wrap={false}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function FieldRows({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([label, value], i) => (
        <View
          key={i}
          style={[
            styles.fieldRow,
            { backgroundColor: i % 2 ? COLOR.zinc100 : COLOR.white },
          ]}
        >
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldValue}>{value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function Pill({ text, bg }: { text: string; bg: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 7,
        paddingVertical: 2,
        paddingHorizontal: 7,
        marginLeft: 6,
      }}
    >
      <Text style={{ color: COLOR.white, fontSize: 8, fontFamily: "Helvetica-Bold" }}>
        {text}
      </Text>
    </View>
  );
}

function PageNumber({ right }: { right: number }) {
  return (
    <Text
      fixed
      style={[styles.pageNumber, { bottom: 20, right }]}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  );
}

function MessageHistory({
  d,
  lang,
  messagesDict,
  messages,
  userLabel,
  photos,
  images,
}: {
  d: Dict;
  lang: "pt" | "en";
  messagesDict: Record<string, string>;
  messages: (TicketMessage | ComplaintResponse)[];
  userLabel: string | undefined;
  photos: boolean;
  images: Map<string, Buffer>;
}) {
  return (
    <View>
      <SectionTitle>{d.report.history}</SectionTitle>
      {messages.length === 0 ? (
        <Text style={{ fontSize: 10, color: COLOR.zinc500, marginBottom: 8 }}>
          {d.report.historyEmpty}
        </Text>
      ) : null}
      {messages.map((m, idx) => {
        const sender =
          m.sender === "admin"
            ? m.senderName || d.common.admin
            : userLabel ?? d.common.anonymous;
        const actionLabel = messageActionLabel(messagesDict, m.action);
        const forwardText =
          m.action === "forward" && m.content
            ? `${messagesDict.forwardedTo}: ${m.content}`
            : null;
        const body = m.action === "forward" ? null : m.content || null;
        const photoAttachments = photos
          ? m.attachments.filter((a) => a.kind === "image" && images.has(a.path))
          : [];
        return (
          <View key={idx} style={{ marginBottom: 8, paddingHorizontal: 8 }}>
            <Text
              style={{
                fontFamily: "Helvetica-Bold",
                fontSize: 9.5,
                color: COLOR.zinc500,
              }}
            >
              {formatDateTime(m.createdAt, lang)} — {sender}
            </Text>
            {actionLabel ? (
              <Text style={{ fontSize: 8.5, color: COLOR.zinc400 }}>{actionLabel}</Text>
            ) : null}
            {forwardText ? (
              <Text style={{ fontSize: 9.5, color: COLOR.zinc700 }}>{forwardText}</Text>
            ) : null}
            {body ? <Text style={{ fontSize: 10 }}>{body}</Text> : null}
            {photoAttachments.map((a) => (
              <Image
                key={a.id}
                src={images.get(a.path) as Buffer}
                style={{
                  marginTop: 6,
                  maxHeight: 320,
                  objectFit: "contain",
                  alignSelf: "flex-start",
                }}
              />
            ))}
            <View
              style={{
                borderBottomWidth: 0.5,
                borderColor: COLOR.zinc100,
                marginTop: 6,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

function Signatures({
  d,
  lang,
  message,
  images,
}: {
  d: Dict;
  lang: "pt" | "en";
  message: TicketMessage;
  images: Map<string, Buffer>;
}) {
  if (!message.signaturePath || !images.has(message.signaturePath)) return null;
  const label =
    message.sender === "user" ? d.report.signatureUser : d.report.signatureTech;
  return (
    <View style={{ flexDirection: "row", marginTop: 4 }}>
      <View style={{ width: 220 }}>
        <Image
          src={images.get(message.signaturePath) as Buffer}
          style={{ height: 50, objectFit: "contain", alignSelf: "flex-start" }}
        />
        <View
          style={{ borderBottomWidth: 1, borderColor: COLOR.zinc400, marginTop: 6 }}
        />
        <Text
          style={{
            fontSize: 8.5,
            color: COLOR.zinc500,
            textAlign: "center",
            marginTop: 3,
          }}
        >
          {formatDateTime(message.createdAt, lang)}
        </Text>
        <Text
          style={{
            fontSize: 9,
            fontFamily: "Helvetica-Bold",
            color: COLOR.zinc700,
            textAlign: "center",
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function ItemsTable({ d, items }: { d: Dict; items: TicketItemUsage[] }) {
  if (items.length === 0) return null;
  const total = items.reduce((sum, i) => sum + i.total, 0);
  const cols: { label: string; width: string; align: "left" | "right" }[] = [
    { label: d.ticket.items.newItem.replace("...", ""), width: "40%", align: "left" },
    { label: d.ticket.items.quantityShort, width: "15%", align: "right" },
    { label: d.ticket.items.unitPrice, width: "15%", align: "right" },
    { label: d.ticket.items.discount, width: "15%", align: "right" },
    { label: d.ticket.items.total, width: "15%", align: "right" },
  ];
  return (
    <View style={{ marginBottom: 8 }}>
      <SectionTitle>{d.report.itemsTitle}</SectionTitle>
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderColor: COLOR.zinc100,
          paddingBottom: 4,
        }}
      >
        {cols.map((c, i) => (
          <Text
            key={i}
            style={{
              width: c.width,
              fontFamily: "Helvetica-Bold",
              fontSize: 9,
              color: COLOR.zinc500,
              textAlign: c.align,
            }}
          >
            {c.label}
          </Text>
        ))}
      </View>
      {items.map((usage, i) => {
        const values = [
          usage.item.name,
          String(usage.quantity),
          formatCurrency(usage.unitPrice),
          formatCurrency(usage.discount),
          formatCurrency(usage.total),
        ];
        return (
          <View
            key={usage.id}
            style={{
              flexDirection: "row",
              paddingVertical: 3,
              backgroundColor: i % 2 ? COLOR.zinc100 : undefined,
            }}
          >
            {values.map((v, j) => (
              <Text
                key={j}
                style={{ width: cols[j].width, fontSize: 9.5, textAlign: cols[j].align }}
              >
                {v}
              </Text>
            ))}
          </View>
        );
      })}
      <Text
        style={{
          fontFamily: "Helvetica-Bold",
          fontSize: 10,
          textAlign: "right",
          marginTop: 4,
        }}
      >
        {d.report.itemsTotal}: {formatCurrency(total)}
      </Text>
    </View>
  );
}

// ---- ticket report ----

function TicketSummary({ d, tickets }: { d: Dict; tickets: Ticket[] }) {
  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;
  const closed = tickets.filter((t) => t.status === "closed").length;
  const it = tickets.filter((t) => t.type === "it").length;
  const rows: [string, string][] = [
    [d.report.totalRecords, String(tickets.length)],
    [d.admin.dashboard.openTickets, String(open)],
    [d.admin.dashboard.inProgressTickets, String(inProgress)],
    [d.admin.dashboard.closedTickets, String(closed)],
    [d.ticket.fields.it, String(it)],
    [d.ticket.fields.maintenance, String(tickets.length - it)],
  ];
  return (
    <View style={{ marginBottom: 6 }}>
      <SectionTitle>{d.report.summary}</SectionTitle>
      <FieldRows rows={rows} />
    </View>
  );
}

function TicketCard({
  d,
  lang,
  ticket,
  sections,
  images,
}: {
  d: Dict;
  lang: "pt" | "en";
  ticket: Ticket;
  sections: ReportSections;
  images: Map<string, Buffer>;
}) {
  const closeMessage = [...ticket.messages].reverse().find((m) => m.action === "close");

  const fields: [string, string][] = [
    [d.report.subject, ticket.subject],
    [d.report.placeLabel, ticket.place?.name ?? "—"],
    [d.report.statusLabel, statusLabel(d, ticket.status)],
    [d.ticket.criticality.label, d.ticket.criticality[ticket.criticality]],
    [d.report.created, formatDateTime(ticket.createdAt, lang)],
    [d.report.updated, formatDateTime(ticket.updatedAt, lang)],
  ];
  if (sections.requester) {
    fields.push([d.report.requester, formatCpf(ticket.cpf)]);
    if (ticket.requesterName)
      fields.push([d.ticket.fields.requesterName, ticket.requesterName]);
    if (ticket.requesterPhone)
      fields.push([d.ticket.fields.requesterPhone, formatPhone(ticket.requesterPhone)]);
    if (ticket.role) fields.push([d.ticket.fields.role, ticket.role]);
  }
  if (sections.assignee) {
    fields.push([d.report.assignee, ticket.assignedToName ?? d.admin.unassigned]);
  }
  const equipment = equipmentText(ticket);
  if (equipment) fields.push([d.ticket.fields.equipment, equipment]);
  if (ticket.notes) fields.push([d.ticket.fields.notes, ticket.notes]);
  if (closeMessage) {
    fields.push([d.report.finalizedDate, formatDateTime(closeMessage.createdAt, lang)]);
    fields.push([d.report.duration, formatDuration(ticket.createdAt, closeMessage.createdAt)]);
    if (closeMessage.geoLat != null && closeMessage.geoLng != null) {
      fields.push([
        d.report.geoLocation,
        `${closeMessage.geoLat.toFixed(4)}, ${closeMessage.geoLng.toFixed(4)}`,
      ]);
    }
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: COLOR.zinc200,
        borderRadius: 4,
        padding: 8,
        marginTop: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLOR.zinc900,
          borderRadius: 3,
          paddingVertical: 6,
          paddingHorizontal: 10,
          marginBottom: 12,
        }}
      >
        <Text
          style={{ color: COLOR.white, fontFamily: "Helvetica-Bold", fontSize: 11 }}
        >
          {ticket.id}
        </Text>
        <View style={{ flexDirection: "row" }}>
          <Pill text={d.ticket.fields[ticket.type]} bg={typeColor(ticket.type)} />
          <Pill text={statusLabel(d, ticket.status)} bg={statusColor(ticket.status)} />
        </View>
      </View>

      {sections.details ? (
        <View style={{ marginBottom: 12 }}>
          <FieldRows rows={fields} />
        </View>
      ) : null}

      {sections.details && ticket.items.length > 0 ? (
        <ItemsTable d={d} items={ticket.items} />
      ) : null}

      {sections.history ? (
        <MessageHistory
          d={d}
          lang={lang}
          messagesDict={d.ticket.messages}
          messages={ticket.messages}
          userLabel={d.common.requester}
          photos={sections.photos}
          images={images}
        />
      ) : null}

      {sections.signatures && closeMessage?.signaturePath ? (
        <View>
          <SectionTitle>{d.report.signatures}</SectionTitle>
          <Signatures d={d} lang={lang} message={closeMessage} images={images} />
        </View>
      ) : null}
    </View>
  );
}

export async function buildTicketsReport(
  tickets: Ticket[],
  opts: ReportOptions
): Promise<Buffer> {
  const d = dict(opts.lang);
  const images = await preloadImages(
    tickets.flatMap((t) => t.messages),
    tickets.flatMap((t) =>
      [...t.messages].reverse().filter((m) => m.action === "close").map((m) => m.signaturePath)
    ),
    opts.sections
  );

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PageNumber right={48} />
        <Header d={d} opts={opts} defaultTitle={d.report.ticketsTitle} />
        {opts.filters ? (
          <Text style={styles.filters}>{opts.filters}</Text>
        ) : (
          <View style={{ marginBottom: 4 }} />
        )}
        {opts.sections.summary ? <TicketSummary d={d} tickets={tickets} /> : null}
        {tickets.length === 0 ? (
          <Text style={{ fontSize: 10, color: COLOR.zinc500 }}>
            {d.report.noRecords}
          </Text>
        ) : null}
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            d={d}
            lang={opts.lang}
            ticket={ticket}
            sections={opts.sections}
            images={images}
          />
        ))}
      </Page>
    </Document>
  );
}

// ---- tickets table (spreadsheet-style export of the admin list) ----

function tableColumns(d: Dict): {
  header: string;
  weight: number;
  value: (t: Ticket) => string;
}[] {
  return [
    { header: d.ticket.criticality.label, weight: 0.85, value: (t) => d.ticket.criticality[t.criticality] },
    { header: d.report.statusLabel, weight: 0.9, value: (t) => statusLabel(d, t.status) },
    { header: d.admin.assignedTo, weight: 1.1, value: (t) => t.assignedToName ?? "—" },
    { header: d.ticket.idLabel, weight: 1.3, value: (t) => t.id },
    { header: d.report.created, weight: 1.1, value: (t) => t.createdAt.slice(0, 10) },
    { header: d.ticket.fields.requesterName, weight: 1.2, value: (t) => t.requesterName },
    { header: d.ticket.fields.role, weight: 0.75, value: (t) => t.role },
    { header: d.ticket.fields.place, weight: 1.1, value: (t) => t.place?.name ?? "—" },
    { header: d.ticket.fields.equipment, weight: 1.3, value: equipmentText },
    { header: d.report.subject, weight: 1.6, value: (t) => t.subject },
    { header: d.ticket.fields.notes, weight: 1.6, value: (t) => t.notes },
  ];
}

export async function buildTicketsTablePdf(
  tickets: Ticket[],
  opts: TicketsTablePdfOptions
): Promise<Buffer> {
  const d = dict(opts.lang);
  const columns = tableColumns(d);
  const totalWeight = columns.reduce((sum, c) => sum + c.weight, 0);
  const width = (weight: number): string => `${(weight / totalWeight) * 100}%`;

  return renderToBuffer(
    <Document>
      <Page size="A4" orientation="landscape" style={styles.tablePage} wrap>
        <PageNumber right={TABLE_MARGIN} />
        <Header d={d} opts={opts} defaultTitle={d.report.tableTitle} />
        {opts.filters ? (
          <Text style={{ fontSize: 9, color: COLOR.zinc700, marginBottom: 6 }}>
            {opts.filters}
          </Text>
        ) : (
          <View style={{ marginBottom: 2 }} />
        )}

        {/* Legend: what each row background color means. */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text
            style={{
              fontSize: 8,
              fontFamily: "Helvetica-Bold",
              color: COLOR.zinc700,
              marginRight: 8,
            }}
          >
            {d.report.rowColorNote}
          </Text>
          {(["open", "in_progress", "closed"] as const).map((s) => (
            <View
              key={s}
              style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}
            >
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  backgroundColor: TABLE_STATUS_TINT[s],
                  borderWidth: 0.5,
                  borderColor: TABLE_BORDER,
                  marginRight: 4,
                }}
              />
              <Text style={{ fontSize: 8, color: COLOR.zinc700 }}>
                {statusLabel(d, s)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", backgroundColor: COLOR.zinc900 }} fixed>
          {columns.map((c, i) => (
            <Text
              key={i}
              style={{
                width: width(c.weight),
                color: COLOR.white,
                fontFamily: "Helvetica-Bold",
                fontSize: 7.5,
                padding: 3,
                borderRightWidth: 0.5,
                borderColor: TABLE_BORDER,
              }}
            >
              {c.header}
            </Text>
          ))}
        </View>

        {tickets.length === 0 ? (
          <Text style={{ fontSize: 9, color: COLOR.zinc500, marginTop: 8 }}>
            {d.report.noRecords}
          </Text>
        ) : null}

        {tickets.map((ticket) => (
          <View
            key={ticket.id}
            wrap={false}
            style={{
              flexDirection: "row",
              backgroundColor: TABLE_STATUS_TINT[ticket.status],
              borderBottomWidth: 0.5,
              borderColor: TABLE_BORDER,
            }}
          >
            {columns.map((c, i) => (
              <Text
                key={i}
                style={{
                  width: width(c.weight),
                  fontSize: 7,
                  padding: 3,
                  borderRightWidth: 0.5,
                  borderColor: TABLE_BORDER,
                  maxLines: 4,
                  textOverflow: "ellipsis",
                }}
              >
                {c.value(ticket) || "—"}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ---- complaints report ----

function ComplaintSummary({ d, complaints }: { d: Dict; complaints: Complaint[] }) {
  const open = complaints.filter((c) => c.status === "open").length;
  const rows: [string, string][] = [
    [d.report.totalRecords, String(complaints.length)],
    [d.admin.dashboard.openComplaints, String(open)],
    [d.admin.dashboard.closedComplaints, String(complaints.length - open)],
  ];
  return (
    <View style={{ marginBottom: 6 }}>
      <SectionTitle>{d.report.summary}</SectionTitle>
      <FieldRows rows={rows} />
    </View>
  );
}

export async function buildComplaintsReport(
  complaints: Complaint[],
  opts: ReportOptions
): Promise<Buffer> {
  const d = dict(opts.lang);
  const images = await preloadImages(
    complaints.flatMap((c) => [
      ...c.responses,
      { attachments: c.attachments },
    ]),
    [],
    opts.sections
  );

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PageNumber right={48} />
        <Header d={d} opts={opts} defaultTitle={d.report.complaintsTitle} />
        {opts.filters ? (
          <Text style={styles.filters}>{opts.filters}</Text>
        ) : (
          <View style={{ marginBottom: 4 }} />
        )}
        {opts.sections.summary ? (
          <ComplaintSummary d={d} complaints={complaints} />
        ) : null}
        {complaints.length === 0 ? (
          <Text style={{ fontSize: 10, color: COLOR.zinc500 }}>
            {d.report.noRecords}
          </Text>
        ) : null}
        {complaints.map((complaint) => {
          const fields: [string, string][] = [
            [d.report.subject, complaint.subject],
            [d.report.content, complaint.content],
            [d.report.placeLabel, complaint.place?.name ?? "—"],
            [
              d.report.statusLabel,
              complaint.status === "open" ? d.common.open : d.complaint.closed,
            ],
            [d.report.created, formatDateTime(complaint.createdAt, opts.lang)],
            [d.report.updated, formatDateTime(complaint.updatedAt, opts.lang)],
          ];
          if (opts.sections.assignee) {
            fields.push([
              d.report.assignee,
              complaint.assignedToName ?? d.admin.unassigned,
            ]);
          }
          return (
            <View
              key={complaint.id}
              style={{
                borderWidth: 1,
                borderColor: COLOR.zinc200,
                borderRadius: 4,
                padding: 8,
                marginTop: 12,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: COLOR.zinc100,
                  borderRadius: 3,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>
                  {complaint.code}
                </Text>
                <Text
                  style={{
                    fontSize: 9.5,
                    color: statusColor(complaint.status),
                    fontFamily: "Helvetica-Bold",
                  }}
                >
                  {complaint.status === "open" ? d.common.open : d.complaint.closed}
                </Text>
              </View>

              {opts.sections.details ? (
                <View style={{ marginBottom: 12 }}>
                  <FieldRows rows={fields} />
                </View>
              ) : null}

              {opts.sections.history ? (
                <MessageHistory
                  d={d}
                  lang={opts.lang}
                  messagesDict={d.complaint.messages}
                  messages={complaint.responses}
                  userLabel={undefined}
                  photos={opts.sections.photos}
                  images={images}
                />
              ) : null}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
