# Code Generation Plan — U1 opencode-skeleton(Bolt 1)

intent: `260715-opencode-cursor-harness`(Issue #626)/ 上流参照(consumes 全数): requirements.md、unit-of-work.md(U1)、functional-design(business-logic-model.md / business-rules.md / domain-entities.md)、nfr-design(performance-design.md / security-design.md / reliability-design.md ほか)。bolt-plan.md(Bolt 1 行)も参照。

## 実行形態

- builder subagent 1名(amadeus-developer-agent)、origin/main ベースの隔離 worktree(bolt/opencode-skeleton)、c2 隔離規律+builder-prompt-sync-completion+deviation-stop-before-implement をディスパッチプロンプトに明記
- 対象: packages/framework/harness/opencode/(manifest.ts / emit.ts / commands/amadeus.md / dot-gitignore)+ dist/opencode/ 生成 + in-process seam テスト1本

## 計画からの逸脱と裁定(履歴)

1. **実装前停止 → E-OC15 選挙 → A 裁定**: harness.json の二重所有(emit 設計 vs writeHarnessData 既存機構)を builder が検出。emit は1エントリ(commands/amadeus.md)に確定し、設計3ファイルを上流整合へ訂正(fix-diff-independent-reverify 適用)
2. **CI 赤 → 1ファイル追補**: dist/opencode/.gitignore(projectRoot 配置)が seed の amadeus/active-space を live ignore しコミット漏れ → codex 前例(force-add 済みを git ls-files 実測)に合わせ git add -f で追補(efb9c062b)
