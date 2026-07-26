上流入力(consumes 全数): unit-of-work, requirements

# Code Generation Plan — core-harness-enums(Bolt 4)

unit-of-work.md の U4 と requirements.md の FR-4/FR-7d、および本 unit の FD/NFR 成果物(business-logic-model.md §doctor arm 検査フロー・§swarm resolve 分岐、business-rules.md BR-1〜BR-5、domain-entities.md §HarnessType 拡張・§DoctorCheck、nfr-design の reliability/security 設計)に基づく。story 相当は FR-4/FR-7d。

- [x] **Step 1: `amadeus-harness.ts` の4定数に kimi 追加**(FR-4c)
  - `HarnessType` union に `"kimi"`、`HARNESS_DIR_TO_TYPE` に `.kimi-code → kimi`、`KNOWN_HARNESS_DIRS` の probe 順に `.kimi-code`、`KNOWN_RULES_SUBDIR` に `.kimi-code → rules`(同形追加。既存ロジック不変更)
- [x] **Step 2: swarm `HARNESS_VALUES` に kimi 追加**(FR-4b)
  - `amadeus-swarm.ts` の `HARNESS_VALUES` に `"kimi"`(resolveDriver は不変更。subagent floor・未知 driver は既存の fail-closed)
- [x] **Step 3: doctor arm(kimi)実装**(FR-4a)
  - `amadeus-utility.ts` handleDoctor: `.kimi-code` 検出時の arm(adapter 実在・managed block 有無(マーカー + 内容検出・B3 の検出契約を再利用)・`kimi --version` フロア(named constant・実測版・既存 arm 流儀で失敗)・機能 probe(advisory))。otherTrees に `.kimi-code`。B3 引き継ぎの検査候補(マーカー欠落・重複・git ルール残留警告)を織り込む
- [x] **Step 4: 分岐テスト + 検証**(FR-7d)
  - swarm resolve: `--harness kimi` → subagent floor・未知 driver → fail-closed の分岐テスト
  - doctor arm のテスト(tmp 構造での各チェック)
  - `bun run typecheck`・`bun run lint`・`bun run dist:check`・関連テスト

## トレーサビリティ

- FR-4a → Step 3 / FR-4b → Step 2 / FR-4c → Step 1 / FR-7d → Step 4 / DoD → Step 4
- 編集はサンクション済み3箇所のみ。他の core ロジックに触れない

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T05:12:40Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の major は BLM 決定木を実装の真値に修正して解消(記録連鎖が FR-4a→BR-3→BLM→plan→summary で一致)。チェックリスト再検証もクリーン。残存 minor(DoctorCheck enum の superset)は conductor が現行化済み。

### Findings

- (minor / domain-entities DoctorCheck) 到達不能な unknown 状態 → 修正済み(not-installed/missing に現行化)
