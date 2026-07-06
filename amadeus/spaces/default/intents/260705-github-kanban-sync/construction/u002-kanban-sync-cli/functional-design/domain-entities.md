# Domain Entities — u002-kanban-sync-cli

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## IntentCard（中間表現。components.md の定義を正とする）

```ts
type IntentCard = {
  dirName: string;   // カードタイトル（同定キー）
  uuid: string;
  status: string;
  scope: string;     // registry で省略時は "未確認"
  agent: string;     // Active Agent。無ければ "未確認"
  host: string;      // 最終 Timestamp の audit shard の <host>。無ければ "未確認"
  worktree: string;  // Worktree Path。空なら "-"
  stage: string;     // Current Stage。無ければ "未確認"
  awaiting: boolean; // [?] ステージの存在
  issues: number[];  // registry の issues ?? []
  syncedAt: string;  // ISO 8601 UTC
};

type Column =
  | "Awaiting Approval" | "Ideation" | "Inception"
  | "Construction" | "Operation" | "Done";
```

## board 側スキーマ（ensureFields が保証する形）

| フィールド | 型 | 値 |
|---|---|---|
| Status | single select | Column の 6 option |
| Agent / Host / Worktree / Scope / Stage / Issue / Synced At | text | IntentCard の対応値。Issue は `#470` 形式のカンマ区切り |

カードは draft issue（title = dirName、body = Issue リンク + scope + worktree。D-AD1）。
