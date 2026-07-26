# Security Test Instructions — 260725-worktree-ref-fixes

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-summary.md`

- `code-summary.md` の実装判断(payload cwd の marker 検証)を security 観点で検証した(devsecops 視点)。

## 対象変更のセキュリティ検証

- **入力検証**: hook stdin payload の `cwd` は信頼境界外入力 — `hasWorkspaceMarker`(amadeus/ + <harness>/tools/ の両在)成立時のみ採用し、任意ディレクトリへの解決乗っ取りを拒否(t202 test 8 が棄却経路を固定)。JSON parse 失敗・TTY・空 stdin は fail-open で従来 ladder(readHookStdin)
- **秘密情報**: 変更にクレデンシャル・トークンの取り扱いなし。起動行の引用追加はシェル word-split 起因の誤実行を減らす方向(硬化)
- **ゲート整合性**: presence mint 経路の変更は「payload cwd を解決に使う」のみで、mint の human 分類(machine-injected marker 判定)は不変

## リポジトリ全体の依存 audit(対象変更とは別判定)

`bun audit` 実測(2026-07-26T01:31Z): **12 vulnerabilities(3 high / 8 moderate / 1 low)** — いずれも既存依存の advisory で本変更の導入物ではない(本変更は依存追加ゼロ)。cid:build-and-test:c1-doctor-seam に従い隠さず条件付き readiness として記録し、依存更新は本 intent のスコープ外(別作業)へ送る。
