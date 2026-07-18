# Discovered Rules — 260717-state-mirror-fixes

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md(codekb — 証跡スキャンは同日 RE の diff-refresh を代用、practices-discovery:c1)

## 新規発見ルール

なし(0件)— 本 intent の作業面はすべて affirm 済みノルムでカバー(team-practices.md の確認結果参照)。

## 既存ルールの適用確認

- 検証劇場 Forbidden: #1170 のロック修正は「落ちる実証」(注入で赤→revert)を必須とし、実行結果から導出しない検証を作らない(Mandated「新設のゲート・検証スクリプト・チェックは失敗ケースを注入して実際に赤くなることを実証」。business-overview.md の audit-first 品質契約と整合)
- dist/self-install 同期 Mandated: core tools / hooks を触る #1170 修正は `bun run dist:check` + `bun run promote:self:check` を検証コマンド列に含める(code-structure.md の正本→生成物フロー。ロック参加様式は architecture.md の state 書込アーキテクチャ= withAuditLock ドメインに倣う)
- format-currency-grep(reverse-engineering 層): #1172 の fixture 是正は実 state ファイル由来の様式(`[ ] <stage> — SKIP` 717件実測)を使う(code-quality-assessment.md の偽 green 確定)
- bun-coverage 系(local-lcov-pre-push / spawn-blindspot): 修正行の in-process seam 計測を push 前に lcov で確認(technology-stack.md / dependencies.md の Bun 前提)
