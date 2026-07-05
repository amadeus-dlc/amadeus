// u002-kanban-sync-cli: 1 フィールド更新の指定（mutation の alias 束ねの単位）。
export type FieldSpec =
  | { fieldId: string; kind: "text"; text: string }
  | { fieldId: string; kind: "single_select"; optionId: string };
