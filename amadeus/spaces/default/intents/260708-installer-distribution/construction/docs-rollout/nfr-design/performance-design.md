# Performance Design — docs-rollout

> ステージ: nfr-design (3.3) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(適用外宣言)・`tech-stack-decisions.md`

## 適用外の宣言(継承)

NFR 要件で適用外確定。dist 再生成(`bun scripts/package.ts`)と promote:self は既存スクリプトの実行であり、実行時間は既存 CI 予算の範囲(新規の性能設計事項なし)。
