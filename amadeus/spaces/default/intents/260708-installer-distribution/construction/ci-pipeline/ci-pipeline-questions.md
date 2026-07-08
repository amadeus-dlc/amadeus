# CI Pipeline Questions — installer-distribution

> ステージ: ci-pipeline (3.7) / 作成: 2026-07-09
> Construction の質問は例外規定(stage-protocol §3)— 標準4問はすべて確定済み決定から回答可能なため、新規質問なし

## 確定済み回答(出典付き)

1. **CI ツール**: GitHub Actions(既存 `.github/workflows/ci.yml` 単一ワークフロー — 全ユニットの infrastructure-design/cicd-pipeline.md が「同乗・新規ジョブなし」で確定)
2. **ブランチ戦略**: トランクベース+短命 Bolt ブランチ → PR → main(org.md/team.md。今 intent で Bolt 単位 PR #648〜#654 として実証済み)
3. **マージ前の品質ゲート**: 5ゲート = typecheck / lint(Biome)/ dist:check / promote:self:check / tests(smoke+unit+integration、t68 含む)— push と pull_request で実行(team.md Deployment)
4. **アーティファクトリポジトリ**: npm レジストリ(`@amadeus-dlc/setup`)のみ。publish は CI 外の手動(CON-004、手順書 docs/guide/publishing-setup.md)。ECR/CodeArtifact/S3 は不使用(所有インフラゼロ — deployment-architecture)

---

## レビュー経過の記録

- 質問なしの根拠: 上記4問がすべて承認済み成果物(infrastructure-design 5ユニット、team.md、CON-004)から一意に回答可能
