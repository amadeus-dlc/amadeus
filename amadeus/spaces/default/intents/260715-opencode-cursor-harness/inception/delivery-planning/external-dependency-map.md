# External Dependency Map — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`。上流入力: unit-of-work.md / unit-of-work-dependency.md / unit-of-work-story-map.md、requirements.md、team-practices.md(Deployment 変更なし)、feasibility の constraint-register(C-T5/C-T6 外部仕様)、application-design の components.md(AC-3d 実測)。

## 外部依存

| 依存 | 種別 | 影響 Bolt | 状態・扱い |
| --- | --- | --- | --- |
| opencode の受け取り単位仕様(`.opencode/{agents,commands,skills,plugins}`、opencode.json、AGENTS.md) | 外部仕様(docs 実測 2026-07-16) | 1, 2 | 照会日付きで固定。実機検証は Bolt 1/2 の実測で閉じる |
| Cursor の受け取り単位+hooks 仕様(`.cursor/rules/*.mdc`、hooks.json、AGENTS.md、`agent -p`) | 外部仕様(docs 実測 2026-07-16、hooks は v1.7〜) | 3 | tool_name 語彙は Bolt 3 冒頭で実測(E-OC9)。写像不能は降格 |
| GitHub Actions CI(既存ワークフロー) | 内部インフラ(変更なし) | 全 | 新 dist は既存ジョブの宇宙に自動編入(dist:check) |
| record-sync PR #1019 / e2 の PR #1011 | 並行 PR(同一 codekb アンカー) | record 面のみ | 後着地側が union 解消(手順は re-scans 記録に明記済み)。実装 Bolt には非依存 |
| npm レジストリ / release.yml | リリース経路(変更なし) | — | 本 intent はリリースを含まない(通常フローに乗るだけ) |

## 非依存の確認

- AWS・外部 SaaS・認証基盤への依存なし(feasibility 既決)
- installer(packages/setup)は E-OC7 Q1=B により依存から除外(別 Issue)— Bolt 4 の起票のみが接点
