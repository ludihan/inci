// Seeds the local dev database with ONE fully-populated ticket — every
// optional field, attachments on the opening message, an assigned technician,
// follow-up messages from both sides, priced services, items/materials used,
// and both signatures on the close. Also fills in the service-provider company
// so the Ordem de Serviço PDF has a header.
//
//   node --experimental-strip-types --loader ./scripts/ts-resolve-hook.mjs scripts/seed-full-ticket.mjs
//
// NOT for production: it only touches the NODE_ENV!=production data dir.
// Safe to re-run — each run adds a new ticket.

import { deflateSync } from "zlib";

// Minimal solid-colour PNG encoder so each seeded photo attachment is
// visually distinct (and obviously not a signature) in the generated PDF.
function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function solidPng(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const o = row + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// A 1x1 transparent PNG data URL, good enough as a "signature".
const SIG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

import {
  createTicket,
  createPlace,
  renamePlace,
  createArea,
  createServiceType,
  createItem,
  createAdmin,
  assignTicket,
  addTicketAssignment,
  addTicketMessage,
  addTicketItem,
  addTicketService,
  updateTicketCriticality,
  updateCompanySettings,
  listPlaces,
  listAreas,
  listServiceTypes,
  listItems,
  getDB,
  getTicketById,
} from "../lib/store.ts";
import { saveAttachment, saveSignature, saveImage } from "../lib/uploads.ts";

async function ensureNamed(list, name) {
  const existing = await list();
  return existing.find((x) => x.name === name);
}

async function ensureTech(name, username, permissions) {
  const db = await getDB();
  const found = db.admins.find((a) => a.username === username);
  if (found) return found;
  const res = await createAdmin({
    name,
    username,
    password: "senha123",
    role: "admin",
    permissions,
  });
  return res.admin;
}

// --- catalog -----------------------------------------------------------
let place = await ensureNamed(listPlaces, "Matriz");
if (!place) place = await createPlace("Matriz", "07147665000171");
else await renamePlace(place.id, place.name, "07147665000171");

let area = await ensureNamed(listAreas, "TI");
if (!area) area = await createArea("TI");

const rafael = await ensureTech("Rafael Costa", "rafael", ["it", "maintenance"]);

async function ensureServiceType(name, price) {
  return (
    (await ensureNamed(listServiceTypes, name)) ??
    (await createServiceType(name, price)).serviceType
  );
}
const suporte = await ensureServiceType("Suporte técnico", 120);
const maoDeObra = await ensureServiceType("Mão de obra — hora técnica", 90);

async function ensureItem(name, price) {
  return (
    (await ensureNamed(listItems, name)) ??
    (await createItem(name, price)).item
  );
}
const cabo = await ensureItem("Cabo de rede Cat6 (m)", 3.5);
const conector = await ensureItem("Conector RJ45", 1.2);
const fonte = await ensureItem("Fonte ATX 500W", 189.9);

// --- attachments ------------------------------------------------------
const PHOTO_COLORS = [
  [64, 120, 200],
  [200, 90, 70],
  [90, 170, 110],
  [200, 160, 60],
  [140, 100, 180],
];
let photoIndex = 0;
async function image(name) {
  const color = PHOTO_COLORS[photoIndex++ % PHOTO_COLORS.length];
  const res = await saveAttachment(
    new File([solidPng(480, 640, color)], name, { type: "image/png" })
  );
  if (!res.ok) throw new Error(`image ${name}: ${res.error}`);
  return { path: res.path, kind: "image" };
}

// --- service provider (company) -------------------------------------
const logo = await saveImage(
  new File([solidPng(120, 120, [30, 30, 40])], "logo.png", { type: "image/png" })
);
await updateCompanySettings({
  name: "M F Refeições e Eventos LTDA",
  cnpj: "07147665000171",
  addressStreet: "Rua Candelária",
  addressNumber: "200",
  addressNeighborhood: "Coroado",
  phone: "9298494125",
  formCode: "O.S MASF-7.1.3-01",
  logoPath: logo.ok ? logo.path : null,
});

// --- the ticket ------------------------------------------------------
const ticket = await createTicket({
  type: "maintenance",
  cpf: "39053344705",
  subject: "Computador desliga sozinho — Guichê 03",
  placeId: place.id,
  areaId: area.id,
  requesterName: "Mariana Teixeira de Oliveira",
  requesterPhone: "85991234567",
  role: "Coordenadora Administrativa",
  equipment: "Desktop de atendimento — Guichê 03",
  equipmentBrand: "Dell",
  equipmentModel: "OptiPlex 3080 Micro",
  notes:
    "Reincidência: mesmo equipamento apresentou falha parecida em julho. " +
    "Solicitante fica no prédio anexo, ramal 4021.",
  criticality: "medio",
  message:
    "O computador desliga sozinho após alguns minutos ligado e faz três bipes curtos " +
    "ao tentar ligar de novo. Já testamos outra tomada e o problema continua.",
  attachments: [
    await image("frente-do-equipamento.png"),
    await image("etiqueta-de-patrimonio.png"),
    await image("tela-com-erro.png"),
  ],
});
console.log("Chamado criado:", ticket.id);

await updateTicketCriticality(ticket.id, "urgente");
await assignTicket(ticket.id, rafael.id);
await addTicketAssignment(ticket.id, { action: "assume", actorName: rafael.name });

await addTicketMessage(ticket.id, {
  content:
    "Complementando: quando desliga, a luz do gabinete pisca. Libero o equipamento a partir das 8h.",
  sender: "user",
  action: "message",
  attachments: [await image("luz-do-gabinete.png")],
});
await addTicketMessage(ticket.id, {
  content: "Recebido. Levo uma fonte reserva e cabos para deixar o guichê operante.",
  sender: "admin",
  senderName: rafael.name,
  action: "message",
});

await addTicketService({ ticketId: ticket.id, serviceTypeId: suporte.id, quantity: 1, unitPrice: 120, discount: 0 });
await addTicketService({ ticketId: ticket.id, serviceTypeId: maoDeObra.id, quantity: 2, unitPrice: 90, discount: 15 });

await addTicketItem({ ticketId: ticket.id, itemId: fonte.id, quantity: 1, unitPrice: 189.9, discount: 0 });
await addTicketItem({ ticketId: ticket.id, itemId: cabo.id, quantity: 5, unitPrice: 3.5, discount: 2.5 });
await addTicketItem({ ticketId: ticket.id, itemId: conector.id, quantity: 4, unitPrice: 1.2, discount: 0 });

const techSig = await saveSignature(SIG_DATA_URL);
const clientSig = await saveSignature(SIG_DATA_URL);
await addTicketMessage(ticket.id, {
  content:
    "Fonte substituída e cabo do guichê refeito com conectores novos. Equipamento em teste por 40 min, " +
    "sem desligar. Solicitante acompanhou e assinou.",
  sender: "admin",
  senderName: rafael.name,
  action: "close",
  signaturePath: techSig ?? undefined,
  signatureClientPath: clientSig ?? undefined,
  attachments: [await image("fonte-nova-instalada.png")],
});

const final = await getTicketById(ticket.id);
console.log(
  JSON.stringify(
    {
      id: final.id,
      status: final.status,
      criticality: final.criticality,
      assignedTo: final.assignedToName,
      place: final.place?.name,
      area: final.area?.name,
      messages: final.messages.map((m) => ({
        action: m.action,
        sender: m.sender,
        attachments: m.attachments.length,
        signatures: [m.signaturePath, m.signatureClientPath].filter(Boolean).length,
      })),
      services: final.services.map((s) => ({ name: s.serviceType.name, total: s.total })),
      items: final.items.map((i) => ({ name: i.item.name, total: i.total })),
    },
    null,
    2
  )
);
console.log("\nAbra em: /pt/admin/tickets/" + final.id + "  (técnico: rafael / senha123)");
