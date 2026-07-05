// u002-kanban-sync-cli: ensureFields が返す field 名 → ID の対応表。
export type FieldMap = {
  status: { id: string; options: Map<string, string> };
  text: Map<string, string>;
};
