# ビルド手順 — Slop cleanup

上流入力: `code-generation-plan.md`、`code-summary.md`

## 前提条件

- リポジトリルートで Bun 1.3.13 互換環境を使用する。
- 依存関係は既存の `bun.lock` に従う。今回、新しい依存関係、環境変数、設定ファイル、ローカルサービスは追加していない。
- 作業ツリーには番号回答再発防止など別件差分があるため、Slop cleanup 対象だけを確認し、既存差分を revert しない。

## ビルドと検証

次の順に実行する。

```bash
bun run typecheck
bun run dist:check
bun run promote:self:check
```

成功条件は、TypeScript の両 tsconfig が error 0、dist 7 harness と self-install 5 harness が正本と同期していることである。今回のリポジトリは配布可能な TypeScript 資源を直接扱うため、追加の bundle や transpile は不要である。

## トラブルシューティング

- `typecheck` が失敗した場合は、最初の TypeScript diagnostic を今回の正本2ファイルへ追跡し、対象外ファイルを変更しない。
- `dist:check` が失敗した場合は `bun run dist`、`promote:self:check` が失敗した場合は `bun run promote:self` を正本修正後に実行する。生成先を直接編集しない。
- 別件差分が生成面に存在しても、正本との同期が取れていれば Slop cleanup の失敗とは判定しない。
