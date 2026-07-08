# Deployment Strategy — installer-distribution

> ステージ: deployment-pipeline (4.1) / 作成: 2026-07-09
> 出典: `deployment-pipeline-questions.md`(確定回答)、`../../construction/ci-pipeline/ci-pipeline.md`、手順書章5

## 戦略

- **即時公開+dist-tag による段階配布**: 安定版は `latest`、プレリリース(`X.Y.Z-rc.N`)は `--tag next` — blue/green・canary 相当の漸進性は npm dist-tag で代替する(利用者は `@next` を明示した場合のみプレリリースを取得)
- **トラフィック切替基準**: 該当なし(pull 型配布 — 利用者が npx/bunx 実行時に取得)。中断条件は「公開後検証(手順書章6)の失敗」— その場合は直ちにロールバック手順へ
- **バージョン境界の安全弁**: インストーラ側の downgrade-unsupported / installed-newer-than-latest 判定(REL-U02)が、公開物の巻き戻り・取り違えから利用者を保護する(コード側の実装済み担保)
