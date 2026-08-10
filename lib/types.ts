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
  content: string;
  photoPath?: string;
  status: ComplaintStatus;
  responses: ComplaintResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface DB {
  admins: Admin[];
  tickets: Ticket[];
  complaints: Complaint[];
}
