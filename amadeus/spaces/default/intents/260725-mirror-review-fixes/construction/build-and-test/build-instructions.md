# ビルド手順

## 前提と入力

本手順は、[code-generation-plan.md](../%7Bunit-name%7D/code-generation/code-generation-plan.md) と [code-summary.md](../%7Bunit-name%7D/code-generation/code-summary.md) を入力とする。Node.js互換のBun 1.3.13、Git、TypeScript依存関係が必要で、Mirrorのローカル検証に外部サービスや追加環境変数は不要である。

依存関係を初回だけ固定ロックで導入する。

```bash
bun install --frozen-lockfile
```

## ビルドと検証

正本TypeScriptを型検査し、6つのdistribution surfaceと4つのself-install surfaceが正本に同期していることを検証する。

```bash
bun run typecheck
bun run dist:check
bun run promote:self:check
```

完全なrepository-native検証は次で実行する。

```bash
bun run test:ci
```

## 成功条件とトラブルシューティング

- `typecheck`がexit 0である。
- `dist:check`がClaude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeをすべて`OK`とする。
- `promote:self:check`がClaude、Codex、Cursor、OpenCodeをすべて`OK`とする。
- `test:ci`がFailed files 0、Failed assertions 0で終了する。

drift失敗時は生成コピーを直接編集せず、正本を修正して`bun run dist`と`bun run promote:self`を実行する。AWS認証が無効な環境ではlive SDK/substrate testsが既定どおりskipされるため、ローカルロジックの失敗とは区別する。
