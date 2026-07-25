# Performance Test Instructions — harness-provenance

上流入力: `harness-provenance/code-generation/code-generation-plan.md`, `harness-provenance/code-generation/code-summary.md`

## 適用する性能要件

本機能は同期ローカル判定であり、再現可能な wall-clock SLO はない。`performance-requirements.md` の PERF-1〜PERF-6を構造的に検証する。

| 要件 | 検証 |
|---|---|
| PERF-1 | 分岐と固定mappingだけでO(1) |
| PERF-2 | network、subprocess、追加file read/writeがruntime detectorにない |
| PERF-3 | CWD probe候補が固定5件 |
| PERF-4 | birthあたりdetector呼出が1回 |
| PERF-5 | non-env resolutionをprocess内で1回cache |
| PERF-6 | env overrideをcacheより前にcall-time評価 |

## 実行

```bash
bun test tests/unit/t269-harness-provenance.test.ts
bun test tests/integration/t269-harness-provenance.cli.test.ts
bun test tests/integration/t270-harness-provenance-birth.test.ts
bun tests/complexity-gate.ts --check
```

## 成功条件

- 構造制約を所有するcaseが全て成功する。
- complexity regressionが0件。
- 既存test timeout・retryを変更または緩和しない。
- wall-clockは診断値に留め、環境未固定の時間差を合否判定に使わない。

## 非該当

HTTP load、throughput、auto-scaling、soak test はservice/network/常駐processを持たないため非該当。新しいbenchmark harnessは追加しない。
