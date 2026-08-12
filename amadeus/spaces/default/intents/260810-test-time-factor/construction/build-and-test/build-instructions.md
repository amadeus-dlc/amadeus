# ビルド手順 — TEST_TIME_FACTOR

上流の [`code-generation-plan.md`](../{unit-name}/code-generation/code-generation-plan.md) と [`code-summary.md`](../{unit-name}/code-generation/code-summary.md) に記録された最終差分を対象とする。

## 前提環境

- Bun `1.3.13` を使用する。
- 依存関係は `bun install --frozen-lockfile` で取得する。
- ローカルの `TEST_TIME_FACTOR` は未指定または `1`、CI 相当検証は `2` とする。
- 長時間稼働サービス、データベース、外部サービスは不要である。

## 実行コマンド

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run lint
bun run distribution:check
bun run source-only:check
bun tests/test-time-factor-guard.ts
git diff --check
```

## 成功条件

- build、typecheck、distribution、source-only、timing guard、diff check が exit `0` である。
- lint は exit `0` で、既存の cognitive-complexity warning 以外に error を出さない。
- `dist/` と self-install 面は生成物として扱い、source boundary を越えて追跡対象へ混入させない。
