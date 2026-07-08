# CI/CD Pipeline — docs-rollout

> ステージ: infrastructure-design (3.4) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-D01: t68+dist:check/promote:self:check)

## 既存ゲートへの同乗(変更なし)

- この PR の CI 検証は既存5ゲート(typecheck/lint/dist:check/promote:self:check/tests — t68 含む)そのまま。CI 設定への変更はゼロ
- dist 再生成+promote:self はローカルで実行し同一コミットに含める(CI は check モードで検証するのみ — 既存の分業)
