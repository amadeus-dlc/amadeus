# ビルド手順 — nfr-kind-pruning

## 参照成果物と前提

入力は `construction/nfr-kind-pruning/code-generation/code-generation-plan.md`（code-generation-plan）と `code-summary.md`（code-summary）である。Bun 1.3.13、リポジトリ直下、既存の `package.json` と `bun.lock` を使用し、外部サービスや追加環境変数は必要としない。

## 実行手順

1. `bun install --frozen-lockfile` — lockfileを変更せず依存を復元する。
2. `bun run typecheck` — framework本体とtestのTypeScript型検査を実行する。
3. `bun run lint` — Biomeによる静的検査を実行する。既知warningは許容するがerrorは許容しない。
4. `bun scripts/package.ts --check` — 7 harnessの配布生成物が正本と一致することを確認する。
5. `bun run promote:self:check` — self-install面のドリフトがないことを確認する。

## 合格条件とトラブルシューティング

全コマンドがexit 0であること。`tsc: command not found` の場合だけ手順1を再実行する。共有CPU環境で既知のheavy integrationが15秒timeoutになった場合は、AGENTS.mdの規定どおり対象ファイルを `bun test --timeout 120000 <file>` で単独再実行し、実障害か環境timeoutかを切り分ける。
