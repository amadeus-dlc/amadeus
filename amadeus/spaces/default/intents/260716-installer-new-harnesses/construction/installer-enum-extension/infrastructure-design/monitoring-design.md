# Monitoring Design — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-design/performance-design.md`、`../nfr-design/security-design.md`、`../nfr-design/scalability-design.md`、`../nfr-design/reliability-design.md`、`../nfr-design/logical-components.md`、`../../../inception/application-design/components.md`、`../../../inception/application-design/services.md`、`../functional-design/business-logic-model.md`。

## 監視設計

- ランタイム監視・SLO・アラート: N/A(reliability-design.md の N/A を継承 — 単発 CLI にランタイムサービス・SLI が不存在。observability:c3 様式: timeout・単発 run 成功を SLO へ昇格させない)
- 品質シグナル(監視の代替面): CI の既存ジョブ(typecheck / lint / dist・self-install drift guard / テスト)が退行検出を担う — 既存 workflow が唯一の正本(ci-pipeline:c2 主)。main 上のジョブ失敗の赤可視化は ci-pipeline:c3 の loud-fail 契約(副)
- doctor advisory(C6b): 環境の実態列挙 — 監視ではなく利用者向け診断表示(BR-5: fail 経路なし)

## 新規メトリクス

なし — 「新しいサービス・コンポーネント」に該当する追加物が存在しない(embedded 変更のみ)ため、operation ガードレールのヘルス/エラーレートメトリクス要件の対象外(反証可能な根拠: deployment-architecture.md の配置節 — 新規デプロイ単位なし)。
