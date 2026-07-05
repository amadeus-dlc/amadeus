// u002-kanban-sync-cli: board 非依存の中間表現（components.md の IntentCard を正とする）。
export type IntentCard = {
  dirName: string;
  uuid: string;
  status: string;
  scope: string;
  agent: string;
  host: string;
  worktree: string;
  stage: string;
  awaiting: boolean;
  issues: number[];
  syncedAt: string;
};
