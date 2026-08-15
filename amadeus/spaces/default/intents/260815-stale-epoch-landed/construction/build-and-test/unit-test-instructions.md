# Unit Test Instructions — intent 260815-stale-epoch-landed

> test-strategy Comprehensive / depth Minimal。

- 台帳・ゲート系: `bun tests/gen-coverage-registry.ts --check` / `bun tests/allowlist-semantic-audit.ts --check` / `bun tests/complexity-gate.ts --check` / `bun tests/control-byte-gate.ts --check`(builder 実測すべて exit 0)
- blocking は CI の Patch/Project Coverage Gate を正とする(remote-first)。allowlist `selfReportLifecycle` は DA:907,0 実測に基づく理由書換 + 再アンカー済み
