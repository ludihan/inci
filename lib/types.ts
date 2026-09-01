export type TicketType = "it" | "maintenance";
export type TicketStatus = "open" | "in_progress" | "closed";
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

export interface Place {
  id: string;
  name: string;
  createdAt: string;
}

export interface Settings {
  logoPath: string | null;
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
  geoLat?: number;
  geoLng?: number;
  createdAt: string;
}

export interface Ticket {
  id: string;
  type: TicketType;
  cpf: string;
  subject: string;
  requesterName: string;
  requesterPhone: string;
  role: string;
  equipment: string;
  equipmentBrand: string;
  equipmentModel: string;
  notes: string;
  place: Place | null;
  status: TicketStatus;
  assignedToId?: string;
  assignedToName?: string;
  messages: TicketMessage[];
  createdAt: string;
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
  place: Place | null;
  status: ComplaintStatus;
  assignedToId?: string;
  assignedToName?: string;
  responses: ComplaintResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface DB {
  admins: Admin[];
  places: Place[];
  tickets: Ticket[];
  complaints: Complaint[];
}
