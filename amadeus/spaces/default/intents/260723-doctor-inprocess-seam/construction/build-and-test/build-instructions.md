# Build Instructions — Doctor in-process seam

## 上流成果物

- `construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `construction/doctor-inprocess-seam/code-generation/code-summary.md`

上記の実装範囲と検証コマンドを正本とし、Issue #857 の TypeScript source、tests、
6 harness の生成物だけを検証する。

## 前提条件

- Bun と `node_modules/` が利用可能であること
- repository root で実行すること
- OS 固有の外部 service、database、秘密情報、追加 env var は不要
- 依存が未導入の場合だけ `bun install --frozen-lockfile` を実行する

## ビルドと静的検証

次の順序で実行する。

```bash
bun run typecheck
bun run lint:check
bun scripts/package.ts --check
```

- typecheck は production と tests の2つの tsconfig を検証する
- lint は既存 warning を許容するが、新規 error は許容しない
- package check は `packages/framework/core` と6 harness の `dist/` が一致することを検証する

## 成功条件

- 3コマンドがすべて exit 0
- source と生成物に drift がない
- `git diff --check` で application source、tests、dist、Build and Test 成果物が clean

## トラブルシューティング

- TypeScript error: 最初の error の source path と呼び出し側を確認し、同じ型契約へ揃える
- Biome error: `bun run lint` の出力箇所だけを修正し、無関係な整形を行わない
- package drift: `bun scripts/package.ts` で生成後、`--check` を再実行する
- dependency error: lockfile を変更せず `bun install --frozen-lockfile` を再実行する
