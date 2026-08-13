# Integration Test Instructions — 260813-remove-team-up

上流入力(consumes 全数): `construction/remove-team-up/code-generation/code-generation-plan.md`(Step 3 が doctor 修復文言、Step 4 が glossary 対訳)、`construction/remove-team-up/code-generation/code-summary.md`(変更 `t226`、検証に `t226` / `t414` を含む)。

## 対象と方針

| 対象 | 要件 | テスト |
|---|---|---|
| Codex project-trust doctor がランチャ再実行を案内しない | FR-4 | `tests/integration/t226-migration-doctor-heartbeats.test.ts` |
| glossary 投影 write/check が現行語彙と同期 | FR-5 | `tests/integration/t414-glossary-projection.integration.test.ts` |
| 配送面からランチャが消える | FR-6 | 本ステージの `bun run build` 後、`.claude/tools/team-up.sh` 不在を実測 |

ランチャ専用 integration / e2e(`t266` / `t267` / 名前付き `*team-up*`)は FR-3 で削除済み。本 Intent はそれらを再導入しない。

## 実行コマンド

```
bun test ./tests/integration/t226-migration-doctor-heartbeats.test.ts ./tests/integration/t414-glossary-projection.integration.test.ts
```

## テストデータ

新規 fixture は置かない。削除した `tests/fixtures/team-up-codex-safety-wait/` を復元しない。

## カバレッジ期待

doctor と glossary の境界が green であること。フルスイート(`bun run test:ci`)は本ステージでは対象を絞った再測を正とし、負荷の大きい無関係 integration の完走を受け入れ条件にしない。
