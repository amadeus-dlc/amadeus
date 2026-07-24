# Reverse Engineering 鮮度

## 最新スキャン

- Date: `2026-07-24T02:35:32Z`
- Repository: `amadeus`
- Project type: Brownfield
- Intent: `260724-mirror-auto-modes`
- Scope: `amadeus-feature`
- Base commit: `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`
- Observed commit: `2126ec1144a6fd0808021d7c386c1afbfdea6ae2`
- Method: Developer code scan を Architect がリポジトリ全体の9成果物へ合成

## 分析範囲

- core 正本、6ハーネス overlay、`dist/`、self-install、setup/package/promote pipeline
- mirror config、CLI、orchestration、state/receipt、shared library、mirror skill
- t232、t257、t265 を中心とする unit/integration/e2e tests
- CI、typecheck、lint、coverage、dist/self-install drift guard
- 日英の guide/reference と今回 Intent の Ideation 成果物
- mirror 三モードの target delta、安全性、回復性、provenance

## 鮮度の扱い

本ファイルは共有 repo-level freshness pointer であり、次回 Intent の differential base の正本ではない。今回 Intent 固有の base、observed、focus、date は `re-scans/260724-mirror-auto-modes.md` に記録する。次回は自身の re-scan record、または既存 records の最新 observed commit を用いる。
