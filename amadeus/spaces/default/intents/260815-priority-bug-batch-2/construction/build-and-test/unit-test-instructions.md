# Unit Test Instructions — intent 260815-priority-bug-batch-2

> Test Strategy: Comprehensive / Depth: Minimal。本 intent は既存バグ4件の修正(self-fix)であり、テストは code-generation 段で TDD により実装済み(`code-generation-plan.md` の FR-1〜FR-4、実測は `code-summary.md` §TDD 実測)。本書は再実行手順を規定する。

## フレームワークと実行方法

- ランナー: `bun test`(unit 単体)/ フルスイートは `bash tests/run-tests.sh --ci`
- 追加セットアップ不要(fixture はテスト内で自己完結)。時間係数は `TEST_TIME_FACTOR`(CI 既定 2)

## 要件対応の unit テスト(regression seam)

| 要件 | Issue | テストファイル | 実行コマンド |
|------|-------|----------------|--------------|
| FR-1 選挙再tally の preservedResultDigest | #3077 | `tests/unit/`(election 既存 49 テスト)+ 下記 integration | `bun test tests/unit/t553*.test.ts` ほか election 群 |
| FR-2 recompose の phase 軸ガード | #3074 | `tests/unit/t246-routing-and-autonomy-guards.test.ts` | `bun test tests/unit/t246-routing-and-autonomy-guards.test.ts` |
| FR-3 壁時計アサーション是正 | #3075 | 触れた 19 テストファイル(A/B 群 16 箇所是正) | フルスイートで担保(個別列挙は code-summary 参照) |
| FR-4 t224 timeout 宣言 | #3079 | `tests/integration/t224-upstream-v2-migration-cli.test.ts` | integration 指示書参照 |

## カバレッジ期待値

- blocking 正本は CI の Project Coverage Gate(絶対下限 + merge-base 相対 0.02pp)と Patch Coverage Gate。ローカルは `coverage-patch-quick`(advisory)まで
- 本 intent の変更本番行は lcov DA 実測で uncovered ゼロ(`code-summary.md` §検証、builder 実測)
