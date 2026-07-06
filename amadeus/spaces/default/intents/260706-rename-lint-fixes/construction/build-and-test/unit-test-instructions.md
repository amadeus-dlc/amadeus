# unit-test instructions（260706-rename-lint-fixes)

上流入力: [code-summary.md](../rename-lint-fixes/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 検証

- B001/B002（rename 漏れ）: `npm run test:it:rename-leftovers`（8 観点、データ駆動 allowlist）。
- B003（linter sensor）: `npm run test:it:linter-sensor`（4 観点、隔離 workspace。fail/pass/フォールバック維持/実 rule fixture）。
- 単体粒度の検査は上記 eval が担い、専用 unit test の新設はしない（bugfix scope、Right-Sizing）。
