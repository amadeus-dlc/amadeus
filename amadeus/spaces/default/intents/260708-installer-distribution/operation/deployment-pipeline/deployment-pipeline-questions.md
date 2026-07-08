# Deployment Pipeline Questions — installer-distribution

> ステージ: deployment-pipeline (4.1) / 作成: 2026-07-09
> 標準5問はすべて確定済み決定から回答可能 — 新規質問なし

## 確定済み回答(出典付き)

1. **デプロイ戦略(blue/green・canary・rolling)**: 該当なし — デプロイ基盤非保有(team.md Deployment、deployment-architecture 全ユニット)。「デプロイ」= npm publish(即時全体公開)+プレリリースは `--tag next` で latest を汚さない段階配布(手順書章5)
2. **環境昇格ゲート(dev→staging→prod)**: 環境なし。昇格は「PR 5ゲート(CI)→ 人間マージ → v タグ発行 → 手動 publish」の直列(ci-pipeline.md)
3. **本番承認ワークフロー**: publish は npm 2FA(auth-and-writes、SEC-P02)を持つメンテナの手動実行のみ。CI からの publish 経路は存在しない(CON-004)
4. **ロールバック手順**: deprecate+パッチ版(unpublish 原則不使用 — npm 規約)。手順書章7 → 本ステージの rollback-runbook.md に運用手順として具体化
5. **フィーチャーフラグ戦略**: 該当なし(CLI 配布物。CloudWatch Evidently/AppConfig 等の基盤を持たない)
