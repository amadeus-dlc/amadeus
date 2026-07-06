# unit-test instructions（260705-upstream-sync）

上流入力: [code-summary.md](../upstream-sync/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

取り込んだエンジン変更（compose dispatch、validateGrid、recompose、stop hook tier-2b 等）の単体挙動は、上流 b67798c3 側のテストスイートで担保された実装の無改変再コピー / 3-way merge である。当方独自の新規ロジックはないため、専用 unit test の新設はしない（Right-Sizing）。

## 検証

- `npm run test:all` に含まれる既存 eval 群（28 種）が当方 fix の退行を検査する（#498/#499/#501/#504/#507 の各 eval を含む）。
- パリティの単位検査は `npm run parity:check`（バイト一致、199 engine files）が担う。
