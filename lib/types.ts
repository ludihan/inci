export type TicketType = "it" | "maintenance";
export type TicketStatus = "open" | "in_progress" | "closed";
export type TicketCriticality = "critica" | "urgente" | "medio" | "baixo";
export type ComplaintStatus = "open" | "closed";
export type Module = "it" | "maintenance";
export type AdminRole = "admin" | "superadmin";

export interface Admin {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: AdminRole;
  permissions: Module[];
  createdAt: string;
}

export interface Unit {
  id: string;
  name: string;
  cnpj?: string;
  companyId?: string;
  company?: Company | null;
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  defaultPrice: number;
  createdAt: string;
}

export interface Area {
  id: string;
  name: string;
  createdAt: string;
}

export interface TicketItemUsage {
  id: string;
  item: Item;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface ServiceType {
  id: string;
  name: string;
  defaultPrice: number;
  createdAt: string;
}

export interface TicketServiceUsage {
  id: string;
  serviceType: ServiceType;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Settings {
  logoPath: string | null;
  // Digit length required for a matrícula on new tickets. Superadmin-configurable
  // at /[lang]/admin/settings; existing tickets keep whatever length they were
  // created with (their hash isn't reversible, so changing this never breaks them).
  matriculaDigits: number;
}

// A service-provider company shown on the Ordem de Serviço (Service Order) PDF
// header, resolved from the ticket's unit when the unit has one, falling back to
// the primary company otherwise. Multiple companies can exist; units optionally
// point at one. Manageable at /[lang]/admin/company.
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  phone: string;
  formCode: string;
  logoPath: string | null;
  createdAt: string;
  unitCount?: number;
}

export interface Attachment {
  id: string;
  path: string;
  kind: "image" | "video";
}

export type TicketMessageAction =
  | "open"
  | "close"
  | "message"
  | "assume"
  | "forward"
  | "release";

export interface TicketMessage {
  id: string;
  content: string;
  attachments: Attachment[];
  sender: "user" | "admin";
  senderName?: string;
  action: TicketMessageAction;
  signaturePath?: string;
  signatureClientPath?: string;
  // geoLat/geoLng were removed; existing DB columns are left in place but unused.
  createdAt: string;
}

export interface Ticket {
  id: string;
  type: TicketType;
  // Keyed hash of the requester's code (a matrícula, or an 11-digit CPF on
  // legacy tickets). The raw code is never stored — compare with
  // matriculaMatches() / hashMatricula() from lib/matricula.
  matriculaHash: string;
  subject: string;
  requesterName: string;
  requesterPhone: string;
  role: string;
  equipment: string;
  equipmentBrand: string;
  equipmentModel: string;
  notes: string;
  criticality: TicketCriticality;
  items: TicketItemUsage[];
  services: TicketServiceUsage[];
  unit: Unit | null;
  area: Area | null;
  status: TicketStatus;
  assignedToId?: string;
  assignedToName?: string;
  messages: TicketMessage[];
  createdAt: string;
  clientTimezone?: string;
  updatedAt: string;
}

export type ComplaintResponseAction =
  | "open"
  | "close"
  | "message"
  | "assume"
  | "forward"
  | "release";

export interface ComplaintResponse {
  id: string;
  content: string;
  attachments: Attachment[];
  sender: "user" | "admin";
  senderName?: string;
  action: ComplaintResponseAction;
  createdAt: string;
}

export interface Complaint {
  id: string;
  code: string;
  subject: string;
  content: string;
  attachments: Attachment[];
  unit: Unit | null;
  status: ComplaintStatus;
  assignedToId?: string;
  assignedToName?: string;
  responses: ComplaintResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface DB {
  admins: Admin[];
  units: Unit[];
  companies: Company[];
  areas: Area[];
  items: Item[];
  serviceTypes: ServiceType[];
  tickets: Ticket[];
  complaints: Complaint[];
}
