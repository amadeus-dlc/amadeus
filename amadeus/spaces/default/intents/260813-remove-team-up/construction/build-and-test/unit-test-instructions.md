# Unit Test Instructions — 260813-remove-team-up

上流入力(consumes 全数): `construction/remove-team-up/code-generation/code-generation-plan.md`(Step 5 が不在回帰、Step 2 がランチャ駆動テスト削除)、`construction/remove-team-up/code-generation/code-summary.md`(追加 `tests/unit/t-remove-team-up-absence.test.ts`、検証 54 pass の当時記録)。

- Test Strategy: Comprehensive(`amadeus-state.md` の `**Test Strategy**: Comprehensive`)。「15 tests per component は上限であってノルマではない」ため、要件駆動の検査のみ置く。

## 対象と方針

| 対象 | 要件 | テスト |
|---|---|---|
| ランチャ正本・safety-wait 正本の不在 | FR-1, FR-2 | `t-remove-team-up-absence` の `git ls-files` 検査 |
| ランチャ駆動テストの削除 | FR-3 | 同ファイル。`tests/**/*team-up*` の残件は NFR-1 置換ファイルのみ |
| ガイドに live 起動レシピが無い | FR-5 | 同ファイルの `docs/guide` 走査 |
| doctor が死んだ CLI を推奨しない | FR-4 | 同ファイルの `amadeus-utility.ts` 走査 |
| glossary 投影の同期 | FR-5 | `tests/unit/t414-glossary-projection.test.ts` |

NFR-1 は「正本・投影・docs に `team-up.sh` 起動レシピが無い」回帰を 1 本以上置くこと。実装は `t-remove-team-up-absence.test.ts`。ファイル名が `*team-up*` に当たるため、空配列ではなく当該 1 ファイルを残件として固定する(本ステージで修正・再測)。

## 実行コマンド

```
bun test ./tests/unit/t-remove-team-up-absence.test.ts ./tests/unit/t414-glossary-projection.test.ts
```

日常 CI では `bun tests/run-tests.ts --ci` の unit 層に含まれる。

## カバレッジ期待

削除差分に対する不在固定が受け入れ条件。Patch Coverage Gate の新規 waiver は追加しない。ローカル `coverage:ci` の事前完走は必須にしない。
