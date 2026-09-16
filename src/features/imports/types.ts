import type { CatalogEntry, DeliveryRule, MallEvidence } from "@/features/checks/types";

export type ImportFile = "catalog" | "rules" | "evidence";

export interface ImportIssue {
  level: "error" | "warning";
  file: ImportFile;
  row?: number;
  column?: string;
  message: string;
}

export interface ImportBundle {
  catalog: CatalogEntry[];
  rules: DeliveryRule[];
  evidence: MallEvidence[];
  issues: ImportIssue[];
}
