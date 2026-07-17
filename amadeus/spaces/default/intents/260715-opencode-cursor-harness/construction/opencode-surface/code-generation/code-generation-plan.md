# Code Generation Plan — U2 opencode-surface(Bolt 2)

intent: `260715-opencode-cursor-harness`(Issue #626)/ 上流参照(consumes 全数): requirements.md(FR-1/FR-2/AC-6b)、unit-of-work.md(U2)、functional-design(business-logic-model.md / business-rules.md / domain-entities.md)、nfr-design 一式。bolt-plan.md(Bolt 2 行)も参照。

## 実行形態

- builder subagent 1名(amadeus-developer-agent)、swarm prepare の隔離 worktree(`.amadeus/worktrees/bolt-opencode-surface`、base = origin/main)。c2 隔離規律 + builder-prompt-sync-completion + deviation-stop-before-implement をディスパッチプロンプトに明記
- 対象: `harness/opencode/emit.ts` の emission table へエントリ追加のみ(R-U2-1 — 構造変更なし): AGENTS.md / opencode.json.example / session skills 4本合成。既存 t-opencode-emit.test.ts へケース追加(新規テストファイルなし)
- U1 と同一ファイル(emit.ts)を触るため U1 着地(#1032 マージ)後に直列着手(priority-vs-dependency (2))

## 計画からの逸脱と裁定(履歴)

1. **実装前停止 → E-OC16 選挙 → C 裁定**: ディスパッチ項目3が「orchestrator skill を core から合成」と実在しない機構を引用 → builder が実装前停止で検出。C(session skills 4本のみ合成、orchestrator は Bolt 1 の `.opencode/commands/amadeus.md` 据置)で確定し、上流(functional-design/component-methods)を訂正
2. **#1039 drift 混入 → 責務分離で除外**: 実装中に検出した `dist/opencode/amadeus-settings.ts` の cross-merge drift は本 Bolt の責務外として除外し、#1040(E-PB4 (b) minimal regen PR)の着地後に rebase で解消
