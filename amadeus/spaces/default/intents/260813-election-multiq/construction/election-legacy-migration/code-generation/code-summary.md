# Code Summary — election-legacy-migration

## 結果

既存の `scripts/amadeus-election-migrate.ts` は plan → approve → apply → verify を既に提供していた。再実装せず、U6 設計契約との差分だけを閉じた。

確認で、レガシー単問 corpus の fidelity と fail-closed は `t556` に揃っていた一方、FR-COMP-4 が要求する新多問 corpus の回帰と、CLI `--verify` の write-free / 改変 plan 拒否が不足していた。加えて CLI `JSON.parse(...) as T` と `as ElectionState` が unknown 境界を破っていた。U3 が記録した allowlist over-count（live 1 / allowlist 2）は、当該 cast を除去したあと live 0 まで縮小した。

新多問ケースは U1/U3 dual-read が既に v2 を受け入れるため、追加直後から green だった。Red を先に作る実装欠落はなく、欠落していたのは回帰証拠である。

## 変更ファイル

| Path | 変更 |
|---|---|
| `scripts/amadeus-election-migrate.ts` | `ElectionV2State` を widening で `ElectionState` へ渡し、CLI JSON を unknown + predicate で受理。`isReceipt` の status 判定をリテラル比較へ変更 |
| `tests/integration/t556-election-legacy-migration.integration.test.ts` | canonical v2 多問 corpus の digest/question ID 一致と、改変 target の fail-closed を追加 |
| `tests/integration/t262-elections-migration.integration.test.ts` | `--verify` の write-free、不正 approval、改変 plan 拒否、適用後 verify を追加 |
| `tests/.unchecked-cast-allowlist.json` | `scripts/amadeus-election-migrate.ts` を削除し total 33 → 31。shrink-only |
| `.../code-generation/code-generation-plan.md` | Standard-depth plan と実結果に基づく完了状態 |
| `.../code-generation/code-summary.md` | 本実装・検証結果 |
| `.../code-generation/pr-convergence-report.md` | local convergence evidence |

## 要件トレーサビリティ

| Requirement / rule | 実装・検証 |
|---|---|
| FR-COMP-1、BR-M7 | 旧単問 decode の `legacy-question` が移動前後で一致。既存 t556 と CLI verify で回帰 |
| FR-COMP-4、BR-M6 | 旧単問と新多問の双方で before/after canonical digest が一致。意味不一致は fail-closed |
| FR-COMP-2、BR-M1 | dry-run plan と `--verify` は write-free |
| BR-M2 | apply は plan digest に束縛された approval 必須 |
| BR-M3 | schema bytes は rename/registry 以外で書き換えない |
| BR-M4/M5 | 明示 election ID。collision/dirty/conflict は move 前拒否 |
| BR-M8/M9 | same-plan retry。mismatch 時に source/target evidence を削除しない |
| NFR-3 | migrate script の json-parse-as を 2 → 0 |
| NFR-5 | focused tests、typecheck、lint、source-only、unchecked-cast、t420 を実施 |

## TDD 証拠

- 新多問 / CLI verify ケース追加後の focused suite: `bun test --timeout 120000 tests/unit/t262-elections-migration.test.ts tests/integration/t262-elections-migration.integration.test.ts tests/integration/t556-election-legacy-migration.integration.test.ts` は exit 0、15 pass / 0 fail / 71 expect calls。
- 新多問ケースは既存 dual-read 契約の上に載るため、追加時点で green。実装欠落による Red は観測していない。
- Unchecked-cast: 修正前 allowlist 2 / measured 0（over-count）。修正後 `--update` で当該サイトを削除し、`--check` は exit 0、新規 cast 0、残 31。

## 検証結果

| Command | Result |
|---|---|
| focused t262/t556 | exit 0、15 pass / 0 fail / 71 expect calls |
| `bunx @biomejs/biome check`（U6 source/test 4 files） | exit 0、diagnostic なし |
| `bun run typecheck` | exit 0 |
| `bun tests/unchecked-cast-guard.ts --check` | exit 0、新規 cast 0、残 31 |
| `bun test --timeout 120000 tests/integration/t420-unchecked-cast-guard-cli.test.ts` | exit 0、19 pass / 0 fail |
| `bun run source-only:check` | exit 0、`source-only boundary: clean` |
| `git diff --check`（U6 所有ファイル） | exit 0 |

## 計画からの逸脱

- Step 2 の「実装前 Red」は、欠落がテスト証拠であり実装ではなかったため、characterization test として追加した。
- repository-wide `test:ci` は実行していない。U3 が記録した team-up 失敗など U6 所有外の既知失敗を本 unit の BLOCKER にしない。
- API/endpoint、DB migration、frontend、IaC、deployment artifact は生成していない。

## Blocker

なし。U6 所有テストと allowlist は収束した。
