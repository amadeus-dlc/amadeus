# Scalability Requirements — setup-foundation

> ステージ: nfr-requirements (3.2) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-F09 の1実行2リクエスト上限)・`business-logic-model.md`(直列パイプライン)、services.md

## 適用外の宣言(根拠付き)

本プロジェクトは短命のローカル CLI であり、水平/垂直スケーリングの対象システムを持たない(services.md: 常駐サービスなし、feasibility: クラウドインフラなし)。適用され得る唯一の「規模」軸は以下の2点で、いずれも既存決定でカバー済み:

1. **配布物サイズの成長**: ストリーミング展開(performance-requirements)により、dist ツリーが数倍化してもメモリ特性は不変
2. **API rate limit(多数ユーザー/CI の同時利用)**: 1実行2リクエスト設計(BR-F09)+ rate-limit 分類エラー(FR-012)。ADR-003 に GITHUB_TOKEN 将来拡張を記録済み

新たなスケーラビリティ要件は導入しない(再利用棚卸し: 既存の設計決定で十分)。
