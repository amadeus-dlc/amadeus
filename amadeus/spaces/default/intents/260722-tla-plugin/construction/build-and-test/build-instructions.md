# ビルド手順

上流入力(consumes 全数): 5ユニットの `code-generation-plan.md` と `code-summary.md`

## 前提条件

- Bun 1.3.13、TypeScript、Git を利用する。
- repository root で `mise trust` 済みであることを確認する。
- 依存関係は `bun install --frozen-lockfile` で復元し、`bun.lock` を暗黙更新しない。
- 実TLC受入を再実行する場合だけ、JDK/sandbox-exec（Darwin）または Docker（Linux）が必要になる。通常のローカルビルドには不要。

## ビルドと静的検査

```bash
bun run typecheck
bun run lint
bun run dist:check
bun run promote:self:check
```

正本は `packages/framework/core/` と `packages/framework/harness/<name>/` である。`dist/` と project-local self-install は生成物なので、ドリフト時は手編集せず次を実行してから再検査する。

```bash
bun scripts/package.ts
bun run promote:self
```

## ビルド完了条件

- TypeScript本体・テストの型検査が exit 0。
- Biomeが exit 0。既存warningは件数を記録し、新規errorと混同しない。
- 全6 harnessの `dist:check` が PASS。
- 全4 project-local harnessの `promote:self:check` が PASS。
- `plugins/formal-model-check/stages/formal-model-check.md` と `dist/plugins/formal-model-check/stages/formal-model-check.md` が存在し、`plugins/*/plugins/*/stages` が0件。

## トラブルシューティング

- dist drift: canonical sourceを確認し、`bun scripts/package.ts` を再実行する。
- self-install drift: dist同期後に `bun run promote:self` を実行する。
- complexity/coverage ratchet drift: 正規generatorだけを使い、実コードと対応しない手修正をしない。
- Docker/JDK不足: deterministic testの成功を実TLC受入の代用にせず、環境依存skipまたはPENDINGとして記録する。
