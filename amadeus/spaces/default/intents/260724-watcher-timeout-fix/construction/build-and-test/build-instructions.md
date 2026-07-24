# Build Instructions — watcher-timeout-fix

参照元: `code-generation-plan.md`、`code-summary.md`。Issue #1449 の変更は
`packages/framework/core/tools/team-up.sh` と関連する配布コピー、回帰テストに限定される。

## 前提条件と環境

- Bun 1.3.x を使用する。
- リポジトリルートで `bun install --frozen-lockfile` を実行する。
- 外部サービス、データベース、追加の環境変数は不要。
- `WATCHER_READY_TIMEOUT` と `WATCHER_RESEND_MAX` はテスト内で短縮値または未設定状態へ隔離される。

## ビルドと検証

```bash
bun run typecheck
bun run lint
bun run dist:check
bun run promote:self:check
```

合格条件は typecheck の exit 0、lint の exit 0、全ハーネス配布物と
self-install コピーの同期確認である。lint のリポジトリ既存警告は変更対象ファイル単体の
`biome check` と分離し、新規警告の有無を判断する。

## トラブルシューティング

- `tsc: command not found`: `bun install --frozen-lockfile` を実行してから再試行する。
- dist 不一致: 正本を確認後、`bun scripts/package.ts` で再生成する。
- self-install 不一致: dist 同期後に `bun run promote:self` を実行する。
