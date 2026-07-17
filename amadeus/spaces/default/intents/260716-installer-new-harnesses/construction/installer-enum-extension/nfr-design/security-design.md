# Security Design — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-requirements/security-requirements.md`(SR-1〜4)、`../nfr-requirements/performance-requirements.md`、`../nfr-requirements/scalability-requirements.md`、`../nfr-requirements/reliability-requirements.md`、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`。

## 設計(層別の保証機構)

| 層 | 保証機構 | 変更 |
|---|---|---|
| 入力境界 | `HarnessName.parse` の membership 拒否(exit 2)— brand 型で検証済み証明を運ぶ(parse-don't-validate) | 値集合のみ拡張(SR-1) |
| 依存 | 新規依存ゼロ(Bun-only 維持)— サプライチェーン面の変化なし | なし(SR-2) |
| ネットワーク | 検証は fakeHttp port 差し替えで実 HTTP 不発 — テストが本番エンドポイントへ触れない | なし(SR-2) |
| シークレット | 変更面(列挙値・文言・テスト)に認証情報なし | なし(SR-3) |

## 追加検査の非選定

SR-4(比例選定)どおり、新設のセキュリティ検査は導入しない。既存必須 CI(lint / typecheck / テスト)は全て維持。
