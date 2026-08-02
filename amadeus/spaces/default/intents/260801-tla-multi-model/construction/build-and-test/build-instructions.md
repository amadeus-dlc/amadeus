# ビルド手順

本手順は全 Unit の `code-generation-plan.md` と `code-summary.md` を統合し、Bun-only TypeScript monorepo と生成済み harness/plugin ツリーの整合性を検証する。

## 前提と環境

- Bun 1.3.13、Git、Docker Desktop を使用する。通常のビルド検証には常駐サービスやデータベースは不要である。
- worktree を信頼済みにし、依存が未導入の場合だけ `bun install --frozen-lockfile` を実行する。
- 実 Docker/TLC acceptance を再計測する場合だけ Docker daemon、固定 image、固定 `tla2tools.jar` の取得経路が必要である。
- 秘密情報、追加の GitHub 権限、環境変数は不要である。

## ビルドと生成物検証

以下をリポジトリルートで順に実行する。

```bash
bun scripts/package.ts --check
bun run promote:self:check
bun run typecheck
bun run lint
```

期待結果は全コマンド exit 0 である。lint の既存 complexity warning は許容するが、error と新規の未使用・構文エラーは許容しない。`package.ts --check` は7 harness の `dist/`、`promote:self:check` は5つの project-local root harness を正本と照合する。

## トラブルシュート

- package drift は生成物を手編集せず `bun scripts/package.ts` を実行し、再度 `--check` する。
- root promotion drift は `bun run promote:self` を実行し、再度 `promote:self:check` する。
- constrained VM で30秒 timeout が出た場合は、失敗ファイルを `bun test --timeout 120000 <file>` で単独再実行して真の失敗と wall-clock drift を分離する。
- TLC の実走失敗時は evidence の exit、completion marker、cleanup、Docker receipt を確認し、timeout や統計 pin を緩めて通さない。
