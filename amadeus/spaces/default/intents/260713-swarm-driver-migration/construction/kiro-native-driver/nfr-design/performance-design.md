# Kiro Native Driver Performance Design

## 入力契約と測定境界

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。対象はbalanced split、probe、runtime role/config plan、wave launch、session inventory/projection、Unit-role-child correlationである。Kiro Unit実行時間、model latency、token消費、provider scheduler性能にSLOを置かない。

`n`をUnit数、`w=ceil(n/4)`をwave数、`f`をbaseline後session file数、`r`をallowlist row数とする。

## Processing pipeline

| Component | Processing | Time | Additional memory | Provider process ownership |
|---|---|---:|---:|---:|
| `KiroBalancedWavePlanner` | quotient/remainderとinput連続slice | `O(n)` | `O(n)` | 0 |
| `KiroCapabilityProbe` | CLI/help/auth/config/handshake | resolve scopeで1回 | bounded | short-lived probeのみ |
| `KiroRuntimeAgentPlanFactory` | wave parent 1 + Unit worker config | `O(wave size)` | `O(wave size)` | 0 |
| `KiroWaveManifestProjector` | Unit stable projection + stdin bytes | `O(wave size)` | `O(wave size)` | 0 |
| `KiroSessionInventoryProjector` | baseline差分 + suffix/profile allowlist | `O((f+r) log(f+r))`以下 | `O(f+r)` | 0 |
| `KiroSessionEvidenceCorrelator` | parent/role/child key index + canonical sort | `O(r log r)` | `O(r)` | 0 |

balanced splitはinput orderをsingle passで扱い、dynamic rebalancing、Unit cross-product、partition retryを行わない。

## Probe, wave, and process budgets

probeはfresh resolve scopeでexactly 1回、総45秒以内とする。CLI/helpは各5秒、auth/config validationは各10秒、behavior handshakeは残りbudget内最大30秒で、timeout child/process groupを残さない。

waveごとの`kiro-cli chat` parentはexactly 1件、childはwave Unitと同数の2〜4件、同時active waveは最大1件である。manifest stdin write/EOFを各1回とする。次waveのrole materialization/capture/armは前waveのC-08/C-11 green記録後だけ許可する。

## Session and resource decisions

- U-02はarm前にbaseline inventory、role/config digest、capture/process identityをcheckpointする。
- session observerはbaseline後の`.json`/`.jsonl` allowlist suffixだけを読み、raw message/summary/tool I/Oをmemory/fixtureへ複製しない。
- runtime configはwave parent 1件、Unit worker各1件だけをmaterializeし、terminal/capture seal後にcleanupする。
- session rowはID/parent/agent/status keyで一度indexし、file×row×Unitのcross-productを作らない。
- C-07はprocess supervisor、daemon、queue、remote scheduler、cross-attempt cacheを持たない。

## Verification seams and regression gate

| Requirement | Seam | Verification |
|---|---|---|
| U05-PERF-01 | fake clock/process | probe count/deadline/residual process |
| U05-PERF-02/03 | pure wave planner |全`n>=2` property/operation count |
| U05-PERF-04/05/06 | conductor/process/session trace | parent 1/wave、child 2〜4、active wave 1 |
| U05-PERF-07/09 | inventory/object/buffer observer | generated files/rows、raw retention 0 |
| U05-PERF-08 | stdin port | write/EOF各1/wave |

1件/5件wave、差2以上、drop/duplicate/reorder、parallel wave、C-11 green前arm、quadratic inventory、raw全量保持、45秒超過、EOF欠落をmerge blockerにする。
