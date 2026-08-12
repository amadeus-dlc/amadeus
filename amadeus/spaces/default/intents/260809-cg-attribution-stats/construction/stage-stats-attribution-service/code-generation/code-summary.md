# Code Summary — stage-stats-attribution-service

## 実装結果

- C-05 source: `packages/framework/core/tools/amadeus-stage-attribution-report.ts`（532行、新規）
- C-01 façade: `packages/framework/core/tools/amadeus-stage-stats.ts`
- Unit test: `tests/unit/t486-stage-stats.test.ts`
- Integration test: `tests/integration/t487-stage-stats.integration.test.ts`
- Unit commit: `6a0cf2cd29002ca7b6c9a8769c41c4293b176203` (`feat(stage-stats): integrate attribution reporting`)
- Intent branch integration commit: `65b0caa44` (`feat(stage-stats): integrate attribution service`)
- Batch 3 referee: `converged=true`、`tampered=false`、1/1 converged

既存Stage Statistics CLIを互換façadeとして維持し、parallel window evidence、exclusive selection、U-02 candidate decode、U-03 population accounting、C-05 semantic report、3 renderer、CLI exit/drainを1つのread-only processへ統合した。C-05はselection、cross-component reconciliation、統計、9×17 reason matrix、outlier、methodologyだけを所有し、U-03 accountingを再実行せず、rendererやfaçadeへ逆依存しない。

## 互換性とfailure contract

- attribution absent時のMarkdown/CSV/pretty JSONはSHA-256 characterizationでbyte-compatible。
- `--stage`は既定`code-generation`、`--outliers`は既定10かつ0〜100で、全argvをI/O前に検証する。
- ambiguous identity→zero net→eligibleの排他順と`targetMeasured = eligible + zeroNet + ambiguous`を保持する。
- normal/emptyはexit 0、partial corpusは完全report + stderr + exit 1、typed invariantはstdoutなし + stderr + exit 1、usageはscan前exit 2。
- `process.exit()`を使わず、complete stdout writeとnatural drainを維持する。

## 検証

- U-04 focused: 91 pass / 0 fail / 324 assertions
- U-01〜U-03 provider regression: 38 pass / 0 fail / 1,405 assertions
- Parent integration combined: 129 pass / 0 fail / 1,729 assertions
- Packaging after local build: 10 pass / 0 fail / 121 assertions
- Repository typecheck: pass
- Repository lint: exit 0（既存454 warnings、既存info 16）
- Source-only boundary: clean
- Git diff check: pass

初回`test:ci`はsource追加後のstale local `dist`により`t150-codex-packaging.test.ts`がENOENTとなった時点で停止した。local build後に同testを単独再実行して10/10 Greenとし、生成物はcommitしていない。

## Scale / oversized pipe

fixtureは229 shards、136,011 rows、3,000 windowsを事前assertし、同一CLI processでscan→decode→account→compose→render→drainを実行した。

| Format | Bytes | Producer | Pipe consumer | Digest / parse |
|---|---:|---:|---:|---|
| Markdown | 134,039 | 0 | 0 | full captureと一致 |
| CSV | 95,972 | 0 | 0 | full captureと一致 |
| JSON | 456,935 | 0 | 0 | full captureと一致、`JSON.parse` / `jq empty`成功 |

これによりIssue #2700の未解消残余であった全3formatの65,536 bytes超stdout drainを証明した。

## Scope保持

Issue #2695のFR 25件、NFR 7件、完了条件1〜10を縮小せず、U-01〜U-04の全consumer/provider mappingを実装した。25 FRと完了条件1〜10の個別step・test・scale evidenceは`code-generation-plan.md`の2つの全数トレーサビリティ表を正本とし、本summaryの集計pass数だけでcoverage完了を代用しない。Code Generationの完了はarchitecture reviewとengine gateを経て判定し、Build and Testのstage完了を先取りしない。
