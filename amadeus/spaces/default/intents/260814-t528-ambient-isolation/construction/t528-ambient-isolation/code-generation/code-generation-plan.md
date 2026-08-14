# Code Generation Plan — t528-ambient-isolation(Issue #2981)

> スコープ: self-fix(units-generation SKIP の degrade スコープ)。要件は `<record>/inception/requirements-analysis/requirements.md` の FR-1〜FR-6 から直接スコープした。User stories は SKIP のため、各ステップは FR へ遡る(step → FR の対応を各行に記す)。変更対象は `tests/integration/t528-report-ack-kind.integration.test.ts` の1ファイルのみ(production コード不変 — Q1=A)。

## Steps

- [ ] Step 1: TDD 落ちる実証(→ FR-3) — 修正前の現行テスト #3 が ambient 注入で赤になることを実測する。`CLAUDE_PROJECT_DIR=<本 worktree>`(full autonomy の active intent あり)で `bun test tests/integration/t528-report-ack-kind.integration.test.ts` → #3 の赤(期待 `Unknown --result "failed"` / 実際 `requires --failure`)を記録。env 注入のみでファイル残渣なし(revert = env 非設定)。unset 状態の baseline green も併記。
- [ ] Step 2: テスト #3 の隔離修復(→ FR-1) — `t528:124` を `proj = freshProject()` の明示 projectDir を渡す形へ書き換える(autonomy を持たない fixture のため `runsQualityRepair` は false → `Unknown --result "failed"` を決定的に期待)。
- [ ] Step 3: quality-repair-active 経路のテスト新設(→ FR-2) — fixture に semi/full autonomy を実書込(`mintHumanPresence` で fixture 内 HUMAN_TURN を mint → `applyProductionAutonomyMode`(`amadeus-intent-autonomy-production.ts:735`)の production 書込経路。オラクル再実装はしない)し、`handleReport(["--stage","code-generation","--result","failed"], proj)` が `report --result failed requires --failure <detail>` の typed error directive を返すことを検証。テスト #3(非 autonomy → `Unknown`)との対で分岐反転を固定。
- [ ] Step 4: 機序 B の前提検査(→ FR-4) — `beforeEach`(または describe 冒頭)で `STOCK_GRAPH` の実在を検査し、不在時は `bun run build` を名指すメッセージで fail させる。落ちる実証: 検査を不在パスへ向けた一時実行で新メッセージの赤を実測 → revert。
- [ ] Step 5: 検証(→ FR-6) — 対象ファイル単独 green(`CLAUDE_PROJECT_DIR` 注入あり/なしの両状態)、`bun run typecheck`、`bun run lint`。フルスイート(`bash tests/run-tests.sh --ci`)は conductor が build-and-test で1回通す。

## Traceability(step → FR)

Step 1 → FR-3 / Step 2 → FR-1 / Step 3 → FR-2 / Step 4 → FR-4 / Step 5 → FR-6。FR-5(Issue 追記・新 Issue 起票)はコード変更を伴わず、gh create/comment の人間承認境界(project.md Mandated)に従い最終報告でドラフト提示する(コード生成の対象外)。

## Test configuration

既存の `tests/run-tests.sh` / bun test 構成を変更しない(t528 は integration tier、`.serial.` なしの並行帯のまま)。新テストは既存ファイル内に追加するため test path 集合は不変。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T01:26:01Z
- **Iteration:** 1
- **Scope decision:** none

FR-1/FR-2/FR-4 の実装をテストファイル実体で確認。変更は t528 テストファイル1本のみで production 不変(Q1=A)、後方互換シム・フォールバック分岐の混入なし、オラクル再実装なし、無申告の逸脱なし。非ブロッキング指摘2件(FR-2/FR-4 の落ちる実証ログの verbatim 度、afterEach 側 OTel リセット未実装の残課題記録)。

### Findings

- FOLLOW-UP | code-summary.md: FR-2/FR-4 の落ちる実証記録は FR-3 ほど verbatim なログを伴っていない(scratch に実測ログは保存済み)
- NIT | tests/integration/t528-report-ack-kind.integration.test.ts: OTel リセットの afterEach 側未実装は残課題として妥当に記録済み
