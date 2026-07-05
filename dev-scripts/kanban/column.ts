// u002-kanban-sync-cli: board の列（Status option）。6 列固定（FR-3.2）。
export type Column =
  | "Awaiting Approval"
  | "Ideation"
  | "Inception"
  | "Construction"
  | "Operation"
  | "Done";

export const COLUMNS: Column[] = [
  "Awaiting Approval",
  "Ideation",
  "Inception",
  "Construction",
  "Operation",
  "Done",
];
