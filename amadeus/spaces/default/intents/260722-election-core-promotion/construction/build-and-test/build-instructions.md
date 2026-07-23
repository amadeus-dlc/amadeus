# ビルド手順

本手順は各 Unit の `code-generation-plan.md` と `code-summary.md` を統合した、Amadeus 配布物の最終ビルド手順である。

## 前提条件

- Bun 1.3.13
- Node.js と TypeScript 6.0.3（開発依存）
- リポジトリルートで `mise trust` 済み
- 依存関係が未導入なら `bun install --frozen-lockfile`
- live SDK/substrate test を実行する場合のみ、有効な AWS credentials と Claude substrate

## ビルドと検証

```bash
bun scripts/package.ts
bun run promote:self
bun run typecheck
bun run lint
bun run dist:check
bun run promote:self:check
bun tests/gen-coverage-registry.ts --check
git diff --check
```

`dist:check` は6 harness、`promote:self:check` は4 self-install 面の同期を検証する。lint の既存 complexity warning は exit 0 の advisory として扱い、新規 error または exit 非0を失敗とする。

## トラブルシューティング

- 配布ドリフト: `bun scripts/package.ts` と `bun run promote:self` を再実行する。
- coverage registry の陳腐化: テストの mechanism/size を確認して registry を正規手順で更新する。
- AWS live test の skip: credentials を更新後に `bash tests/run-tests.sh --ci` を再実行する。
- 並列 full CI は共有 fixture に干渉し得るため、同一 worktree では1プロセスだけ実行する。
