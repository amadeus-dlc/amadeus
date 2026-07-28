# Team Allocation — 260727-plugin-verb-skills

上流入力(consumes 全数): unit-of-work.md(Unit 規模)、team-practices.md(ソロ運用規律)、bolt-plan.md 参照(requirements.md / components.md / unit-of-work-dependency.md / unit-of-work-story-map.md は bolt-plan.md の編成を経由して消費)

## 体制(ソロモード — 実在する体制のみ。named mob の捏造をしない)

| 役割 | 担い手 | 責務 |
|---|---|---|
| conductor | 本セッション(claude-code) | 指令ループ、ゲート、§12a/§13 の執行、PR 作成・マージ承認伺い |
| builder | Bolt ごとの worktree 隔離サブエージェント(amadeus-developer-agent) | 実装+検証コマンド完遂(逸脱は実装前停止、state 変更コマンド禁止、同期完遂 — builder-prompt-sync-completion/cg-subagent-state-mutation-ban) |
| reviewer | §12a reviewer-runtime 経由の独立サブエージェント | per-unit code-generation レビュー(自己実装の自己レビュー禁止) |
| 意思決定 | ユーザー | skeleton ゲート、ラダープロンプト、マージ承認、仕様変更エスカレーション |

## 並行度

同時アクティブ builder は最大2(ユーザー裁定 2026-07-28 — Bolt 2∥3 並行化)。Bolt 1(skeleton)と Bolt 4(終端)は単独。
