# Build & Test Results — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): code-generation-plan.md(全6 unit — 各 Bolt の実装方針・TDD・検証計画)、code-summary.md(全6 unit — 着地 PR・実装内容・テスト・実測ゲート・逸脱裁定)

測定 ref: **main = `bfc44e062`**(全6 Bolt 着地後)。検証用 worktree を origin/main から切って実走した実測のみを転記する(cid:requirements-analysis:numbers-from-command-output-only)。

## 統合実行(正準)

`bun run coverage:ci`(= `--ci` runner + coverage、cid:build-and-test:c1-260802-plugin-optin-parity に従い full CI と coverage の統合証跡とする):

```
Test files: 764
Failed files: 0
Total assertions: 10323
Failed assertions: 0
RESULT: PASS
COVERAGE_CI_EXIT=0
```

## ゲート実測

| ゲート | exit | 実測出力 |
|---|---|---|
| `bun install --frozen-lockfile` | 0 | — |
| `bun run typecheck` | 0 | — |
| `bun run lint` | 0 | — |
| `bun run dist:check` | 0 | 全7ハーネス OK |
| `bun run promote:self:check` | 0 | in sync |
| `bun run coverage:ci` | 0 | 上記 |
| `bun tests/coverage-patch-gate.ts --check` | 0 | `measured added lines: 0, covered: 0, allowlisted: 0, uncovered: 0`(main 断面のため追加行ゼロ。各 Bolt 着地時は 76/76・107/107・183/183 で全被覆) |
| `bun tests/coverage-project-gate.ts --check` | 0 | `current 90.2992%, baseline 40.9395%, delta 49.3597pp` |
| `bun tests/gen-coverage-registry.ts --check` | 0 | `fresh, guards green, ratchet held` |
| `bun tests/complexity-gate.ts --check` | 0 | — |
| `bun tests/callsite-guard.ts --check` | 0 | 既存ガード無影響 |
| `bun tests/unchecked-cast-guard.ts --check` | 0 | `0 new casts, 36 remaining (shrink-only)` — **本 intent が新設したガード自身が main で緑** |

## NFR-4(実行時間と決定性)

| 階層 | 実測 | 基準 | 判定 |
|---|---|---|---|
| PR CI(新規 PBT 4本の直接実行) | `Ran 12 tests across 4 files. [171.00ms]` / 1,217 assertions | 2秒以内 | **PASS**(約11.7倍のマージン) |
| 深掘り(`AMADEUS_PBT_DEEP=1`、5本) | `Ran 36 tests across 5 files. [9.04s]` / 600,283 assertions | 非ブロッキング・`timeout-minutes: 5` | **PASS** |

深掘りは PR CI の 493倍の assertion 数(1,217 → 600,283)を約 9 秒で実行する。

## 受け入れ基準の充足(requirements.md)

| AC | 内容 | 判定 |
|---|---|---|
| FR-1 | election 読取の fail-closed 一本化(`parseElectionFile` が両読み口を経由、`readJson` 本体不変) | **充足** — PR #2085 着地、レビュー READY |
| FR-2 | state 2層の round-trip + fail-closed | **充足** — PR #2097、5棄却分岐 lcov DA 全 >0 |
| FR-3 | 非経由経路の静的ガード(allowlist ratchet、落ちる実証必須) | **充足** — PR #2113、面A/面B 両方の実証あり |
| FR-4 | state / election の各1境界以上に round-trip + fail-closed が `test:ci` で実行 | **充足** — t416/t417/t418/t419 が `--ci` の 764 files に含まれる |
| FR-4d | #1459 の反例をテスト固定 | **充足** — t417 に3形(重複 internalNo / 重複 voter / 空 choices)を example 固定 |
| FR-5 | 深掘り実行の最小形(workflow_dispatch・非ブロッキング) | **充足** — PR #2118、`ci-success` の needs は8要素で不変 |
| FR-6 | 軽量台帳(9件+射程判定) | **充足** — `bug-scope-ledger.md`、A1〜A5 二重実測 |
| FR-7(Could) | mirror の property 化 | **充足** — PR #2099(Could だが実施) |
| NFR-1 | dist 7面 + drift 検査 | **充足** — 上表 |
| NFR-2 | coverage patch ゲート(spawn 盲点回避) | **充足** — 各 Bolt で 100% 被覆 |
| NFR-3 | `t258-boundary-guard` | **充足** — full CI に含まれ 0 failed |
| NFR-4 | 決定性・実行時間 | **充足** — 上表 |
| NFR-5 | 既存ブロッキング集合の全緑維持 | **充足** — `coverage:ci` RESULT: PASS |

## verdict

**READY**(無条件)。全 FR/NFR が着地面の実測で充足し、既存ゲート集合は全緑。未検証面の申し送りは下記1件のみで、いずれも本 intent の受け入れ基準外。

## 申し送り

- **#2112**(P3/S4-MINOR): `unchecked-cast-guard` が `unknown` 非経由の多段 `as` 連鎖を過剰カウントする。安全側の不具合で現行コーパスに該当パターンなし。Bolt 5 のレビューで検出し起票済み
- 深掘りジョブ(`pbt-deep`)の**実 CI 環境での初回 run は未実施**。`timeout-minutes: 5` の K=3 は推定であり、初回 run の duration から再導出する旨をジョブコメントに明記済み(cid:nfr-requirements:estimates-not-acceptance-criteria)
