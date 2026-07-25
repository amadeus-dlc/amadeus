# Build and Test Results — harness-provenance

上流入力: `harness-provenance/code-generation/code-generation-plan.md`, `harness-provenance/code-generation/code-summary.md`

## 結果概要

Build、focused test、構造性能、セキュリティ要件はPASS。全体CIで検出した2件のtest metadata不整合を是正し、失敗guardを再実行して未解消failure 0を確認した。外部service、DB、container、IaCは非該当。

## Build results

| コマンド | Exit | 結果 |
|---|---:|---|
| `bun run typecheck` | 0 | 型エラー0 |
| `bun run dist:check` | 0 | 6配布形態が正本と同期 |
| `bun run promote:self:check` | 0 | 4 self-install面が同期 |
| `bun tests/gen-coverage-registry.ts --check` | 0 | registry / ratchet fresh |
| `bun tests/complexity-gate.ts --check` | 0 | 新規違反0、regression 0 |
| `bun run lint` | 0 | error 0。既存warning 265、info 20 |
| `git diff --check` | 0 | whitespace error 0 |

## Test results

- focused harness regression: 38 pass / 0 fail / 167 expect（Unit 26、Integration 12）
- CI profile 2回: 各517 files / 7,221 assertions、同一2 assertionsのみfailure
- failure是正後guard: 58 pass / 0 fail / 1,169 expect
- CIの他515 files / 7,219 assertionsは両runともPASS
- AWS credentials invalid/expiredのためClaude substrate依存live testはrunner既定どおりskip

全体CIの2 failureは、`t269`のtest-size purity違反と、`t269`/`t270`のCLI-spawner手動ラチェット未登録だった。純粋mapping testをUnitへ残し、subprocess/CWD/filesystem testをIntegrationへ移動したうえで、coverage registryと手動ラチェットを同期した。

## Performance and security

- PERF-1〜PERF-6: PASS。固定mapping・最大5候補の同期`existsSync`・birthあたり1回呼出・non-env cache・call-time env優先をtestで確認
- complexity: 新規違反0、regression 0。根拠のないwall-clock gateは設けていない
- SEC-1〜SEC-5: PASS。invalid overrideは`unknown`へ閉じ、state / memory / audit / stdout / stderrの5面でraw値なし
- runtime dependency / `package.json` / `bun.lock`: 変更なし
- `bun audit`: 既存transitive dependencyに12件（High 3、Moderate 8、Low 1）。すべて既存`@anthropic-ai/claude-agent-sdk`依存経路で、本変更による新規依存・新規advisoryは0

## Failures

未解消failureなし。既存dependency advisory 12件と、AWS live substrate skipは本変更起因のfailureから分離した。

## Coverage

coverage registry / ratchetを新しいUnit・Integration配置へ再生成し、freshness・mechanism honesty・test-size purity guardをPASSした。固定percentageは追加していない。

## Stage sensors

| Sensor | 対象数 | 結果 |
|---|---:|---|
| required-sections | 7成果物 | PASS |
| upstream-coverage | 7成果物 | PASS |
| type-check | 5 TypeScript files | PASS |
| answer-evidence | application-design Q&A | PASS |
