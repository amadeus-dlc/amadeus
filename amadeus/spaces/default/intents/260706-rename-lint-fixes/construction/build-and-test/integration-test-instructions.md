# integration-test instructions（260706-rename-lint-fixes）

上流入力: [code-summary.md](../rename-lint-fixes/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 検証手順

1. `npm run test:it:linter-sensor` — sensor → lint:check script → lints ハーネス（no-stub-compat 実 rule 含む）の統合経路を隔離 workspace で駆動（AC Row 3/6）。
2. `bun .agents/amadeus/tools/amadeus-utility.ts scope-table --check` — #537 修正の完走検証（rename-leftovers eval の観点 (d) として test:it:all にも組み込み済み）。
3. `npm run test:all` — 全 eval 連鎖（parity / promote / engine-e2e を含む退行確認）。
