# Build Instructions

入力は Unit `issue-2838` の `code-generation-plan.md` と `code-summary.md`。Bun 1.3.13 の既存 monorepo 設定をそのまま使う。

## 準備

```bash
mise trust
bun install --frozen-lockfile
```

追加の環境変数、ローカルサービス、DB は不要。AWS credentials が無効な場合、live SDK/substrate tests は既存 runner の契約どおり skip される。

## Build と検証

```bash
bun run build
bun run typecheck
bun run lint
bun run distribution:check
bun run source-only:check
git diff --check
```

成功条件は全コマンド exit 0、`distribution:check` の projection 一致、generated surface が Git 境界を越えないこと。lint の既存基準は 466 warnings / 17 infos、exit 0。
