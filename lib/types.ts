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
  photoPath?: string;
  sender: "user" | "admin";
  senderName?: string;
  action: TicketMessageAction;
  createdAt: string;
}

export interface Ticket {
  id: string;
  type: TicketType;
  cpf: string;
  subject: string;
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
  photoPath?: string;
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
  photoPath?: string;
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
