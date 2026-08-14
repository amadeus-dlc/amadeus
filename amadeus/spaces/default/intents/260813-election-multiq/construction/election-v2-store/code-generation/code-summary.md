# Code Summary — election-v2-store

## 結果

commit `3daefad491` で統合済みの U3 store と integration test を設計入力へ追跡し、実装を重複させず差分だけを補正した。既存実装は pending、ledger、materialized ballot、tally history/current、timeline、registry/state 整合、same-run repair を既に提供していた。

確認で、`PendingVoterFileV2` が必須とする top-level `electionId` と `voter` を pending write が保存せず、pending read も directory election / filename / definition との一致を検証していないことを特定した。先行テストで Red を実測後、write envelope に両フィールドを追加し、read を不一致時 `corrupt` の fail-closed とした。

全体 CI の実行中には、既存 U3 実装に残っていた `JSON.parse(... as object)` と `JSON.parse(... as CanonicalBallot)` が unchecked-cast guard の Red となった。両箇所を `unknown` 境界へ戻し、Election definition は `isRecord` で検証してから使用する最小補正を加えた。修正後の standalone guard は新規 cast 0 件で成功した。

## 変更ファイル

| Path | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-election-v2-store.ts` | pending envelope の `electionId` / `voter` 保存と読込時一致検証、未検証 JSON cast 2件の除去 |
| `tests/integration/t549-election-v2-store.integration.test.ts` | envelope 保存、electionId 不一致、voter 不一致の fail-closed regression assertion を追加 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-v2-store/code-generation/code-generation-plan.md` | Standard-depth plan、要件追跡、実結果に基づく完了状態を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-v2-store/code-generation/code-summary.md` | 本実装・検証結果を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-v2-store/code-generation/pr-convergence-report.md` | local convergence evidence と repository-wide 未収束面を記録 |

## 要件トレーサビリティ

| Requirement / rule | 実装・検証 |
|---|---|
| U3 `PendingVoterFileV2` | `schemaVersion`、directory election と一致する `electionId`、filename/definition voter と一致する `voter`、ordered events を保存。両 identity mismatch を `corrupt` として拒否 |
| FR-BAL-5、BR-B1/B2 | voter ごとの blind pending file と full canonical response events を維持。今回の変更は top-level identity envelope の補完に限定 |
| FR-COMP-2、BR-R1〜R3 | canonical new write を v2 envelope とし、破損 identity を silent default 化せず fail-closed |
| FR-RER-2/3、FR-COMP-3 | 既存の append-only history、current/history 検証、same-run repair を focused integration test で回帰確認 |
| NFR-3 | raw JSON を domain 型へ直接 cast する2箇所を除去し、record check / downstream read codec 境界を維持 |
| NFR-5 | focused integration、typecheck、lint、build、source-only、unchecked-cast、diff check を実施。repository-wide `test:ci` は下記 Blocker のため未収束 |

## TDD 証拠

- Pending envelope test 追加後・実装修正前: `bun test --timeout 120000 tests/integration/t549-election-v2-store.integration.test.ts` は exit 1、8 pass / 1 fail / 55 expect calls。保存 JSON に `electionId` と `voter` が存在しない Red を実測した。
- Pending envelope 修正後の最終 focused test: 同 command は exit 0、9 pass / 0 fail / 61 expect calls。保存値と electionId/voter 各不一致 rejection を確認した。
- Unchecked-cast guard: full `test:ci` 内で U3 の2件を `NEW_CAST` として Red 検出。修正後の `bun tests/unchecked-cast-guard.ts --check` は exit 0、新規 cast 0 件となった。

## 検証結果

| Command | Result |
|---|---|
| `bun test --timeout 120000 tests/integration/t549-election-v2-store.integration.test.ts` | exit 0、9 pass / 0 fail / 61 expect calls |
| `bunx @biomejs/biome check packages/framework/core/tools/amadeus-election-v2-store.ts tests/integration/t549-election-v2-store.integration.test.ts` | exit 0、2 files、diagnostic なし |
| `bun run typecheck` | exit 0。source と tests の `tsc --noEmit` が成功 |
| `bun run lint` | exit 0。1818 files、473 warnings / 17 infos。U3 対象2 files の個別検査は clean |
| `bun run build` | exit 0。8 harness の `dist/` と self-install 面を再生成 |
| `bun run source-only:check` | exit 0、`source-only boundary: clean` |
| `bun tests/unchecked-cast-guard.ts --check` | exit 0、新規 cast 0。別変更 `scripts/amadeus-election-migrate.ts` の allowlist over-count advisory 1件 |
| `bun run test:ci` | exit 20、1006 files 中20 failed files、13384 assertions 中68 failed assertions。U3 `t549` は 9 pass / 0 fail |
| `bun test --timeout 120000 tests/integration/t-team-up-run-lifecycle.serial.test.ts` | exit 1、22 pass / 16 fail。既知の重い suite を単独再実行しても safety-wait/run lifecycle 失敗が再現 |
| `bun test --timeout 120000 tests/integration/t420-unchecked-cast-guard-cli.test.ts`（U3 cast 修正後） | exit 1、18 pass / 1 fail。U3 の `NEW_CAST` は解消し、残件は別変更 `scripts/amadeus-election-migrate.ts` と committed allowlist の byte mismatch |
| `git diff --check`（U3 source/test/stage artifacts） | exit 0、whitespace error なし |

## 計画からの逸脱

当初の設計差分は pending envelope の2 identity fields のみだったが、required full CI が同じ U3 source の未検証 JSON cast を fail-closed guard で検出したため、その2箇所も最小修正した。allowlist、team-up、U1/U2/U5、codekb、Intent state は変更していない。API/endpoint、DB migration、frontend、IaC、deployment artifact は U3 の embedded filesystem library 境界に存在しないため生成していない。

## Blocker

- **BLOCKER:** NFR-5 が要求する repository-wide `bun run test:ci` は exit 20 のため未収束。U3 focused test は green だが、workspace 全体を green と報告できない。
- **FOLLOW-UP:** 単独再現する `t-team-up-run-lifecycle.serial.test.ts` の16 failures は U3 所有外であり、team-up 実装の owner が切り分ける必要がある。
- **FOLLOW-UP:** `t420-unchecked-cast-guard-cli.test.ts` の残る1 failure は、別変更 `scripts/amadeus-election-migrate.ts` の live count 1 と committed allowlist count 2 の byte mismatch。U3 の新規 cast は解消済みである。
