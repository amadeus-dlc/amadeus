// u002-kanban-sync-cli: Status（単一選択）の option。id はローカルの照合用で、
// 更新 API（ProjectV2SingleSelectFieldOptionInput）へは送れない（名前で保持される）。
export type StatusOption = { id?: string; name: string; color?: string; description?: string };
