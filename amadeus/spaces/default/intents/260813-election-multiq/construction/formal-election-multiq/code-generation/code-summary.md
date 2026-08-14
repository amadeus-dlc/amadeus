# Code Summary — formal-election-multiq

## 結果

`FormalElection.tla` / `.cfg` / `FormalElectionCore.tla` は、すでに 2 question / 2 voter の有限モデルと I1–I8 を持っていた。`origin/main` への rebase 後も FormalElection の module/cfg/aux/implementation identity は model-map と一致し、completeness は `pass:true` のままだった。再実装せず、rebase 後の identity 束縛と FR-FML-1 の反証証拠だけを閉じた。

formal-model-check の旧 TLC receipt は現行 FormalElection bytes と不一致だった。本 unit ではその履歴 receipt を上書きせず、現行 source に対する `NOT_DETECTED` と EstablishedImmutable / HeldOnlyTargets mutant の COUNTEREXAMPLE を取り直した。

## 変更ファイル

| Path | 変更 |
|---|---|
| `tests/unit/t557-formal-election-multiq.test.ts` | live identity 再計算、completeness、held-only / established の source pin を追加 |
| `tests/integration/t-formal-verif-run-model-check-real.integration.test.ts` | EstablishedImmutable wipe mutant と HeldOnlyTargets rerun mutant を追加 |
| `.../code-generation/code-generation-plan.md` | Standard-depth plan と実結果に基づく完了状態 |
| `.../code-generation/code-summary.md` | 本実装・検証結果 |
| `.../code-generation/pr-convergence-report.md` | local convergence evidence |

FormalElection source、CFG、Core、model-map の FormalElection 行は変更していない。identity 再計算の結果、更新不要だった。

## 要件トレーサビリティ

| Requirement / rule | 実装・検証 |
|---|---|
| FR-FML-1 AC1、I5 | EstablishedImmutable wipe mutant が COUNTEREXAMPLE。trace で preserved={Q1} のまま results[Q1] が none になる |
| FR-FML-1 AC1、I6 | HeldOnlyTargets rerun mutant が COUNTEREXAMPLE |
| FR-FML-1 AC2、Identity contract | t557 が live canonical identity と raw impl sha256 を model-map と照合。completeness `pass:true` |
| I1–I8、S8 | 既存 FormalElection CFG INVARIANT と t404 / t-formal-verif-tla-model の vocabulary pin |
| NFR-4 | identity 再計算は canonical helper。spec-only `--impl-only` は t380 が拒否 |
| NFR-5 | focused tests、REAL TLC `NOT_DETECTED`、typecheck、lint、source-only |

## TDD 証拠

- t557 追加後: `bun test --timeout 120000 tests/unit/t557-formal-election-multiq.test.ts tests/unit/t404-tla-vocabulary-supply.test.ts tests/unit/t-formal-verif-tla-model.test.ts` は exit 0、23 pass / 0 fail。
- identity / completeness は rebase 後すでに green。欠落していたのは live pin と mutant 反証である。
- EstablishedImmutable mutant の初回は CFG 全 invariant 実行により ResultCompleteness が先に発火した。検査対象を EstablishedImmutable だけに絞り、同じ mutant で Red→Green を閉じた。

## 検証結果

| Command | Result |
|---|---|
| focused t557 / t404 / t-formal-verif-tla-model | exit 0、23 pass / 0 fail |
| t380 impl-only completeness | exit 0、12 pass / 0 fail |
| `AMADEUS_RUN_REAL_TLC=1` FormalElection production | `NOT_DETECTED`、1646ms、completion evidence |
| `AMADEUS_RUN_REAL_TLC=1` PerQuestionIsolation mutant | COUNTEREXAMPLE |
| `AMADEUS_RUN_REAL_TLC=1` EstablishedImmutable mutant | COUNTEREXAMPLE |
| `AMADEUS_RUN_REAL_TLC=1` HeldOnlyTargets mutant | COUNTEREXAMPLE |
| `bunx @biomejs/biome check`（U7 test 2 files） | exit 0、diagnostic なし |
| `bun run typecheck` | exit 0 |
| `bun run source-only:check` | exit 0、source-only boundary clean |
| `git diff --check`（U7 所有ファイル） | exit 0 |

## 計画からの逸脱

- FormalElection source / model-map の更新は不要だった。rebase 後の live identity がすでに一致していた。
- 旧 formal-model-check receipt は前 stage の履歴として残し、現行 bytes に対する TLC を本 unit の検証証拠とした。
- API / repository / DB / frontend / deployment は U7 境界に存在しないため生成していない。
