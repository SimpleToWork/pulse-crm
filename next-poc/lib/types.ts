export interface Company {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  owner?: string;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  phone?: string;
  companyId?: string | null;
  status?: string;
  owner?: string;
  lastContacted?: number | null;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

export const STAGES = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"] as const;
export const OPEN_STAGES = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation"];
export const PRIORITIES = ["low", "medium", "high"] as const;

export interface Deal {
  id: string;
  name: string;
  companyId?: string | null;
  contactId?: string | null;
  stage: string;
  value?: number;
  priority?: string;
  owner?: string;
  expectedClose?: number | null;
  order?: number;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

export interface Task {
  id: string;
  title: string;
  priority?: string;
  status?: "open" | "done";
  due?: number | null;
  owner?: string;
  relatedType?: string | null;
  relatedId?: string | null;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

export interface Ticket {
  id: string;
  subject: string;
  status: string; // open | in-progress | resolved | closed
  priority?: string; // urgent | high | medium | low
  type?: string;
  companyId?: string | null;
  contactId?: string | null;
  owner?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

export type ColType = "text" | "number" | "date";

/** One column's filter: a value checklist (picked=null → all) plus an optional condition. */
export interface ColFilter {
  picked: string[] | null;
  cond: { op: string; a: string; b: string } | null;
}
