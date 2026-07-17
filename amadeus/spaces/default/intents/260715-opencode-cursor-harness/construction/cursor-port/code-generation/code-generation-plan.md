# Code Generation Plan — U3 cursor-port(Bolt 3)

intent: `260715-opencode-cursor-harness`(Issue #626)/ 上流参照(consumes 全数): requirements.md(FR-3/FR-4)、unit-of-work.md(U3)、functional-design(business-logic-model.md / business-rules.md / domain-entities.md)、nfr-design 一式。bolt-plan.md(Bolt 3 行)も参照。

## 実行形態

- builder subagent 1名(amadeus-developer-agent)、swarm prepare の隔離 worktree(`.amadeus/worktrees/bolt-cursor-port`、base = origin/main)。c2 隔離規律 + builder-prompt-sync-completion + deviation-stop-before-implement をディスパッチプロンプトに明記
- 対象: `packages/framework/harness/cursor/` 新設(manifest.ts / emit.ts / dot-gitignore / commands/amadeus.md / hooks adapter)+ dist/cursor/ 生成 + integration テスト
- **工程0(実測ゲート)をディスパッチに内蔵**: Cursor hooks の (a) tool_name 値集合 (b) exit 意味論を公式 docs+独立照合先で実測し、実測不能な面は出荷降格(偽グリーン排除)。fail-closed 化を検出したら実装停止
- U2(emit.ts = opencode 側)とはファイル非交差 → worktree 並行(c6 非交差判定を着手前に実測)

## 計画からの逸脱と裁定(履歴)

1. **工程0裁量内の宣言済み逸脱(選挙不要 — タスク自身が付与した降格裁量の範囲内)**: 公式 docs の tool_name 値集合 `{Shell, Read, Write, Grep, Delete, Task, MCP:*}` は独立照合先(johnlindquist/cursor-hooks — 旧 API リビジョン)で verbatim 照合不能、per-tool `tool_input` 形状も未文書化 → 汎用 `postToolUse+matcher` は core hook 無音 no-op の偽グリーンリスクにつき**出荷しない**(機能表降格)。代わりに payload が verbatim 文書化された Cursor 専用イベント(`afterShellExecution`→runtime-compile / `afterFileEdit`→audit-and-sensors)を配線。PR 本文・実装コメント・コミットに申告
2. **base 前進の再接地(E-PB5 c1(ii) 先行遵守)**: 実装中に origin/main が #1033/#1036/#1040 分前進 → rebase + 全正本面 regen。当初同梱の `dist/opencode/amadeus-settings.ts` drift は #1040 が main 側で修正済みのため自コミットから除外
