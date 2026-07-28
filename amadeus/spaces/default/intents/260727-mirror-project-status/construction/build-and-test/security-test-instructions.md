# Security Test Instructions — 260727-mirror-project-status

上流入力(consumes 全数): code-generation-plan, code-summary(u1-project-sync-skeleton / u2-state-reconcile-hardening / u3-lifecycle-integration / u4-config-overrides-and-diagnostics / u5-docs-and-distribution の全5ユニット)

## 対象(承認済み NFR・実在境界へ trace する範囲 — bt-proportional-selection)

- **秘匿**(nfr-design/security-design、BR-U2-8 / BR-U4-6): token・生 GraphQL 応答を台帳・診断・record に残さない
- **認証境界**: token は gh credential store 委譲・自動 scope 変更/再認証なし(services 認証節)
- **read-only 保証**: repair status は remote/state を変更しない

## 実行方法

- 秘匿注入: `bun test tests/integration/t345-...`(GraphQL errors へ固有トークン注入 → 台帳 0 hit)/ `bun test tests/integration/t349-...`(診断出力 0 hit ×2)
- read-only: t349 の mutation 0 回 history assert+record バイト同一 assert
- 認証境界: docs 認証節の記述と gateway 実装(gh サブプロセス、token 非保持)の突き合わせは u5 §12a レビューで実測済み

## 対象外

リポジトリ全体の依存 audit は本 intent スコープ外の別判定(c1-doctor-seam)。SAST/DAST 基盤は存在せず、NFR にも要求なし。

## 実測

上記テスト全て green(168 pass 合算、測定 ref 45a09c9a0)。
