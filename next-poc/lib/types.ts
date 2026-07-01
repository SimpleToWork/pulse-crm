export interface Company {
  id: string;
  name: string;
  industry?: string;
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

export type ColType = "text" | "number" | "date";

/** One column's filter: a value checklist (picked=null → all) plus an optional condition. */
export interface ColFilter {
  picked: string[] | null;
  cond: { op: string; a: string; b: string } | null;
}
