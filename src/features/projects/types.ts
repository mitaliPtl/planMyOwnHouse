export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  state: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  notes: string | null;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
}
