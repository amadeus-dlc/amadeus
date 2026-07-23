# Build Instructions

## 上流入力

本手順は各 Unit の `code-generation-plan.md` と `code-summary.md`、および統合済み実装を入力とする。U1 `elections-registry`、U2 `election-path-resolver`、U4 `doctor-drift-check` を同一ブランチ上で検証する。

## 前提条件

- Bun 1.3.13 互換環境
- リポジトリルートでの実行
- AWS 認証情報は任意。無効または未設定の場合、live SDK/substrate テストは既定どおり skip される

## ビルド手順

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint:check
```

型検査は `tsconfig.json` と `tsconfig.tests.json` の双方を対象とする。lint の既存 complexity warning は exit 0 の advisory として扱い、新規 error がないことを確認する。

## トラブルシューティング

- `tsc: command not found`: `bun install --frozen-lockfile` を実行する。
- dist drift: `bun run dist:check` で生成元と配布物の差分を確認する。
- 全 CI が60秒を超える場合: referee では対象テストを使い、全 CI は時間制限のない通常実行で別途確認する。
