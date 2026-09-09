// Seeds the local dev database (data/db.sqlite) with sample tickets so the
// admin tickets table has something to show. Safe to re-run — it tops up to
// the target count and never deletes anything.
//
//   node --experimental-strip-types --loader ./scripts/ts-resolve-hook.mjs scripts/seed-test-tickets.mjs
//
// NOT for production: it only touches the NODE_ENV!=production data dir.

import {
  createTicket,
  createPlace,
  createArea,
  createServiceType,
  createAdmin,
  assignTicket,
  updateTicketCriticality,
  addTicketMessage,
  listPlaces,
  listAreas,
  listServiceTypes,
  getDB,
} from "../lib/store.ts";

async function ensure(list, create, names) {
  const existing = await list();
  const byName = new Map(existing.map((x) => [x.name, x]));
  const out = [];
  for (const name of names) {
    out.push(byName.get(name) ?? (await create(name)));
  }
  return out;
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

const places = await ensure(listPlaces, createPlace, [
  "Matriz",
  "Filial Centro",
  "Filial Norte",
  "CD Logística",
]);
const areas = await ensure(listAreas, createArea, [
  "Recepção",
  "Financeiro",
  "TI",
  "Almoxarifado",
  "Enfermaria",
  "Diretoria",
]);
// Keep the service catalog stocked (used by the O.S. flow).
await ensure(listServiceTypes, (name) => createServiceType(name), [
  "Suporte técnico",
  "Instalação",
  "Manutenção preventiva",
  "Troca de peça",
  "Rede / Wi-Fi",
]);

const marcos = await ensureTech("Marcos Andrade", "marcos", ["it"]);
const paula = await ensureTech("Paula Ribeiro", "paula", ["maintenance"]);
const rafael = await ensureTech("Rafael Costa", "rafael", ["it", "maintenance"]);
const techs = [marcos, paula, rafael];

const CRITS = ["critica", "urgente", "medio", "baixo"];
const NAMES = [
  "Ana Souza",
  "Bruno Lima",
  "Carla Dias",
  "Diego Alves",
  "Eduarda Rocha",
  "Felipe Nunes",
  "Gabriela Melo",
  "Heitor Pinto",
];
const SUBJECTS = [
  "Computador não liga",
  "Impressora travando papel",
  "Ar-condicionado pingando",
  "Sem internet cabeada",
  "Monitor com listras",
  "Fechadura não reconhece cartões",
  "ERP muito lento",
  "Lâmpada queimada no corredor",
  "Notebook não conecta no Wi-Fi",
  "Nobreak apitando",
];
const PROBLEMS = [
  "Computador não liga após queda de energia; o LED da fonte fica piscando.",
  "Impressora do setor puxando duas folhas e travando o papel toda hora.",
  "Ar-condicionado da sala pingando água no forro desde ontem.",
  "Sem acesso à internet cabeada em quatro estações de trabalho.",
  "Monitor com listras verticais que aparecem e somem sozinhas.",
  "Fechadura eletrônica da porta principal não reconhece os cartões.",
  "Sistema muito lento ao abrir o ERP: passa de dois minutos para carregar.",
  "Lâmpada do corredor queimada e uma tomada solta na parede.",
  "Notebook novo não conecta no Wi-Fi corporativo, só no aberto.",
  "Nobreak apitando sem parar mesmo com a energia estável.",
];
const EQUIP = [
  ["Notebook", "Dell", "Latitude 3420"],
  ["Desktop", "HP", "ProDesk 400 G7"],
  ["Impressora", "Brother", "DCP-L2540"],
  ["Ar-condicionado", "Elgin", "Split 12.000 BTU"],
  ["Switch", "TP-Link", "TL-SG1024"],
  ["Nobreak", "SMS", "Station II 1200"],
];

const TARGET = 16;
const already = (await getDB()).tickets.length;
console.log(
  `Banco tem ${already} chamado(s). Alvo: ${TARGET}. Criando ${Math.max(0, TARGET - already)}.`
);

for (let i = already; i < TARGET; i++) {
  const type = i % 3 === 0 ? "maintenance" : "it";
  const [equipment, brand, model] = EQUIP[i % EQUIP.length];

  const ticket = await createTicket({
    type,
    cpf: String(10000000000 + i).padStart(11, "0"),
    subject: SUBJECTS[i % SUBJECTS.length],
    placeId: places[i % places.length].id,
    areaId: areas[i % areas.length].id,
    requesterName: NAMES[i % NAMES.length],
    requesterPhone: `1198${String(700000 + i * 137).slice(0, 6)}`,
    role: ["Analista", "Coordenador", "Auxiliar", "Enfermeiro(a)", "Recepcionista"][i % 5],
    equipment,
    equipmentBrand: brand,
    equipmentModel: model,
    notes: i % 4 === 0 ? "Reincidência: já havia sido atendido no mês passado." : "",
    criticality: "medio",
    message: PROBLEMS[i % PROBLEMS.length],
    attachments: [],
  });

  const crit = CRITS[i % CRITS.length];
  if (crit !== "medio") await updateTicketCriticality(ticket.id, crit);

  const cycle = i % 3;
  if (cycle !== 0) {
    const tech = techs[Math.floor(i / 2) % techs.length];
    await assignTicket(ticket.id, tech.id);
    if (cycle === 2) {
      await addTicketMessage(ticket.id, {
        content: "Serviço executado e testado junto ao solicitante. Encerrado.",
        sender: "admin",
        senderName: tech.name,
        action: "close",
      });
    }
  }
}

const final = (await getDB()).tickets;
const by = (k) => final.reduce((m, t) => ((m[t[k]] = (m[t[k]] || 0) + 1), m), {});
console.log("Total de chamados:", final.length);
console.log("Por situação:", by("status"));
console.log("Por criticidade:", by("criticality"));
console.log("Técnicos de teste (senha senha123):", techs.map((t) => t.username).join(", "));
