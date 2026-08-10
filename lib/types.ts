export type TicketType = "it" | "maintenance";
export type TicketStatus = "open" | "closed";
export type ComplaintStatus = "open" | "closed";
export type Module = "it" | "maintenance" | "complaints";
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

export interface TicketMessage {
  id: string;
  content: string;
  photoPath?: string;
  sender: "user" | "admin";
  senderName?: string;
  action: "open" | "close" | "message";
  createdAt: string;
}

export interface Ticket {
  id: string;
  type: TicketType;
  cpf: string;
  subject: string;
  place: Place | null;
  status: TicketStatus;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintResponse {
  id: string;
  content: string;
  sender: "user" | "admin";
  senderName?: string;
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
