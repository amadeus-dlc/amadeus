# ビルド手順

## 上流参照と前提

全9 Unit の `code-generation-plan.md` と `code-summary.md` を入力とする。対象は Bun 1.3.13 のTypeScriptモノレポであり、常駐サービス、データベース、外部インフラは不要である。

- Bun 1.3.13 と依存関係を準備する: `bun install --frozen-lockfile`
- worktree の信頼設定を確認する: `mise trust`
- 個人用provider設定や認証情報はリポジトリへ追加しない
- `dist/`、`.claude/`、`.codex/`、`.agents/` などの生成投影は手編集しない

## ビルドと検証

1. `bun run build` を実行する。これは `bun scripts/package.ts` と `bun scripts/promote-self.ts --apply` を順に実行し、正規ソースから配布面とself-install面を再生成する。
2. `bun run source-only:check` でGit indexが正規ソース、bootstrap/configuration allowlist、Intent runtime stateだけを追跡していることを確認する。
3. `bun run distribution:check` で配布registry、文書契約、公開projectionを検証する。
4. `bun run typecheck` と `bun run lint` を実行する。
5. `git status --short` で生成投影が追跡差分へ戻っていないことを確認する。

成功条件は全コマンドの終了コード0である。lintの既知cognitive-complexity警告は終了コード0のベースラインであり、新規エラーとは区別する。

## トラブルシューティング

- `bun` が見つからない場合は Bun 1.3.13 のPATHを確認する。
- 配布driftが出た場合は生成物を直接直さず、`packages/framework/core/` または該当harness sourceを修正して再ビルドする。
- `source-only:check` が失敗した場合は、新規追跡ファイルがallowlist対象か正規ソースかを確認する。
- constrained VMでintegration testがtimeoutした場合は、失敗ファイルを `bun test --timeout 120000 <file>` で隔離再実行し、機能失敗と負荷揺らぎを切り分ける。
