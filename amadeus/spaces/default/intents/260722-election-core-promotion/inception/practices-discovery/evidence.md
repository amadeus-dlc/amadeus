# Evidence — チーム機能のコア昇格

> 上流入力(consumes 全数): code-structure、technology-stack、dependencies、code-quality-assessment、architecture、business-overview

## 証跡スキャンの代用(practices-discovery:c1)

同日(2026-07-23)の reverse-engineering codekb を証跡スキャンの代用とした。各プラクティス面の裏付け:

| プラクティス面 | 代用証跡 | 観測(要旨) |
|---|---|---|
| ブランチ/デプロイ | architecture.md、technology-stack.md | dist 6面/self-install 5面の配布投影、release.yml 一本のリリース経路 — affirm 済み Way of Working / Deployment と一致 |
| テスト | code-structure.md(テスト資産配置)| 4層ランナー+選挙系 t234〜t244+fake-herdr パターン — affirm 済み Testing Posture と一致 |
| コードスタイル | code-quality-assessment.md(import 衛生)| Bun-only・core/harness 境界の観測 — affirm 済み Code Style と一致。選挙エンジンの scripts/ 配置は境界規約からの逸脱として本 intent が是正対象 |
| セキュリティ/サプライチェーン | dependencies.md | 外部依存は herdr/agmsg の PATH 前提(コード同梱なし)— 新たな供給網面なし |

## インタビュー(ギャップのみ)

ギャップ質問1問(プラクティス変更の有無)→ ユーザー回答 A(変更なし)。practices-discovery-questions.md 参照。
