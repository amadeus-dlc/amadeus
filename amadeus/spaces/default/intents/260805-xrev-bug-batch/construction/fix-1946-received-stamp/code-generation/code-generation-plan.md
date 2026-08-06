# Code Generation Plan — fix-1946-received-stamp

上流入力(consumes 全数): requirements.md（FR-2）, architecture.md, code-structure.md

- 対象 Issue: [#1946](https://github.com/amadeus-dlc/amadeus/issues/1946)（S2-CRITICAL へ昇格予定 — Q7=A）
- 裁定: Q2=A（受理側で刻印。resolveBallots の軸も受理時刻へ。t234 ピンは明示改訂）
- Bolt branch: `bolt-fix-1946-received-stamp`（base `1043b7e67`）
- 実装形態: worktree 分離の並行 builder dispatch（E-OBB4-CGS13。FR-2 全文をプロンプトへ焼き込み）

## Steps（TDD、各スライス RED 実測 → 最小実装 → GREEN）

1. `vote` 受理時に CLI が受理時刻を権威として ballot へ刻む（FR-2a）。自己申告 `submittedAt` は
   集計・順序決定の軸に使わない（参考フィールドとして保持）。
2. `resolveBallots` の最新票選定軸を受理時刻へ移す（FR-2b — 未来日時原票による amend 破棄経路を構造的に閉じる）。
3. late 票レーンの `at: ballot.submittedAt`（store `:633`）も同一変更で受理軸へ（FR-2c、書込点2箇所同時是正）。
4. `t234:310-315` のピンを Q2=A 引用付きで明示改訂（FR-2d — 事前承認済みのテスト契約改訂）。
5. 受け入れ基準（FR-2e）: scratch 選挙ストア（temp dir + project override、実ストア非接触）で
   原票 submittedAt=2099 + 後続 amend GoA8 → 修正後は amend が勝ち `hold(block)`。歴史的 58 行は遡及修正しない。
6. FR-2f: 実装が `specs/tla/FormalElection` の登録エントリに触れるため formal-model 整合を同一変更で行う。
   spec 改訂が必要な場合（受理軸が Later / ExpectedResolution の意味論を変える場合）は Branch B
   （spec 改訂 → model-map 更新 → TLC exhaustive 再走行 green）を FR-2f の事前承認範囲として実施する。
   旧軸をリテラル複製するピン（module identity・行オフセット）の機械的追従も申告付きで行う。

## 対象ファイル目録（設計確定後の導出）

- `packages/framework/core/tools/amadeus-election-model.ts` / `amadeus-election-store.ts` / `amadeus-election.ts`
- `specs/tla/FormalElection.tla` / `specs/tla/model-map.json`（Branch B）
- `plugins/formal-model-check/tools/tla-arm.ts`（TS ミラーの軸同期）
- `tests/unit/t234-election-model.test.ts`（改訂）/ `tests/integration/t451-election-receipt-stamp.integration.test.ts`（新規）
- `tests/unit/t-formal-verif-tla-model.test.ts` / `t404` / loader・source integration（spec 追従の機械的帰結）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T10:12:06Z
- **Iteration:** 1
- **Scope decision:** none

FR-2a-f copied without narrowing, t234 revision cites Q2=A as pre-approved, Branch B falls within FR-2f's own contingency clause, TDD RED/GREEN and TLC exhaustive completion evidence present, deviation-stop-then-ruling and ordering deviation both declared with closing evidence; two non-blocking evidence-clarity gaps.

### Findings

- FOLLOW-UP | code-summary.md states builder stopped on SOURCE_DRIFT with 11 files red, but never traces the resolution count down to 0 (only the final full --ci 0/exit-0 result is shown) - add the intermediate count so the drift-closure claim is self-verifying rather than inferred from the final green run.
- FOLLOW-UP | code-generation-plan.md says historical rows not retroactively fixed = '58 rows' while code-summary.md says 626 rows - requirements.md FR-2e specifies 626 total with 58 contradictory; align the summary's phrasing so it does not read as if the full ledger rather than the 58-row subset is what was left unfixed.
