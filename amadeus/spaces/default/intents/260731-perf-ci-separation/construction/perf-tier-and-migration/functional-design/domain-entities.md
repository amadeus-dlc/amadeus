# Domain Entities — U1 perf-tier-and-migration

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

本 Unit はテストランナー・CI 構成のドメイン。エンティティは型・定数・データ台帳(functional-domain-modeling は runner の既存 idiom に従い、新規ドメイン型の発明はしない — 既存 union 拡張のみ)。

## 型・定数

| エンティティ | 所在 | 変更 |
|---|---|---|
| `Level` union | tests/run-tests.ts:71 | `"perf"` 追加(5値へ) |
| `ParsedArgs` | :74-87 | `runPerf: boolean` 追加 |
| `TEST_TIERS` | tests/gen-coverage-registry.ts:600-605 | `"perf"` 追加(5値へ) |
| t258 timeout 定数 | 移設先 tests/perf/t258-lifecycle-transaction-perf.test.ts | `250_000`(導出コメント付き — component-methods.md C-5) |

## テストファイル台帳(移設前→後)

components.md C-2 表が正本(6ファイル、分割4・whole 2)。本 Unit の diff 対象全数:

- 変更: tests/run-tests.ts、tests/gen-coverage-registry.ts、tests/integration/ の分割元4ファイル
- 新設: tests/perf/ の6ファイル、tests/unit/t-run-tests-perf-tier.test.ts
- git mv: t269、t-plugin-stage-discovery の2ファイル
- データ再生成: tests/.coverage-registry.json、.coverage-project-baseline.json、.coverage-patch-allowlist.json(remap 分)

## 実行面との対応

テストファイル台帳の各行は services.md 実行面表へ写像される: 移設6ファイルの perf 部分は「perf.yml perf-tests」行の実行対象、残置分は「ci.yml tests/coverage-*」行に留まる。blocking 区分の変更は本 Unit のエンティティに含まれない(U2/U3 の責務)。

## 不変条件

- Level と TEST_TIERS の tier 集合は一致を保つ(perf 追加を両方に — 片側だけの追加は registry drift または実行不能 tier を作る。symmetric-pair)
- tests/perf/ 配下に `CI-resident` マーカーを置かない(t257-ci-residency ガードの意味論 — ADR-6)
- helpers(benchmark-child 2ファイル)は無移動(tier 走査対象外 — component-methods.md C-2)
