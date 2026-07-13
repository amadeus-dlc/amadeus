# Codex Native Driver Performance Design

## 入力契約と測定境界

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。対象はapp-server/behavior probe、role/manifest/launch/capture plan、JSONL/hook projection、Unit-role-child correlationである。Codex batch wall-clock、Ultra model latency、token消費、native scheduler性能にSLOを置かない。

`n`をUnit/role数、`j`をallowlist JSONL/collaboration item数、`h`をhook record数とする。

## Processing pipeline

| Component | Processing | Time | Additional memory | Provider process ownership |
|---|---|---:|---:|---:|
| `CodexCapabilityProbe` | app-server projection + unpinned handshake | resolve scopeで1回 | `O(catalog)` | short-lived probeのみ |
| `CodexUnitRoleBinder` | Unit stable sort、token/role全単射 | `O(n log n)` | `O(n)` | 0 |
| `CodexLaunchPlanFactory` | argv/add-dir/role metadata/manifest projection | `O(n)` | `O(n)` | 0 |
| `CodexJsonlProjector` | itemごとのclosed allowlist projection | `O(j)` | accepted `O(j)` | 0 |
| `CodexHookProjector` | recordごとのbinding/schema検証 | `O(h)` | `O(h)` | 0 |
| `CodexEvidenceCorrelator` | thread/role/child key index + canonical sort | `O((n+j+h) log(n+j+h))`以下 | `O(n+j+h)` | 0 |

probe result、catalog、resolved model、thread/agent/hookはfresh resolve/attempt scopeだけで保持し、batch/attempt横断cacheを0件にする。

## Probe and process budgets

CLI/app-server/configは各5秒、catalog/auth/hookは各10秒、behavior handshakeは最大30秒とし、全stepはcandidate総45秒の残りbudgetを超えない。app-serverは1 probe connectionだけを使い、必要response後にstdin close/waitしてdaemonを残さない。

native runはbatch/waveごとに`codex exec --json` parent exactly 1件である。manifest stdin write exactly 1、EOF exactly 1とし、Unitごとのparent processを起動しない。generic worker configは1件を共有し、Unit数分複製しない。

## Streaming and capture decisions

- JSONL/collaboration/hookは逐次allowlist projectionし、message、reasoning、command、file change、transcript、raw payload全体をbufferしない。
- Unit、role、child、thread、hook IDを一度key indexし、全組合せscanを行わない。
- U-02はcapture root/identity、ProbeBinding、tool-env/sandbox digestをcheckpointした後だけproviderをarmする。
- provider group terminalとhook child wait完了後にcaptureをjoin/sealし、それ以前にnormalizer/C-08 verdictを出さない。
- dynamic role metadataと`--add-dir`は`O(n)`で、C-06はworker pool、queue、daemon、process supervisorを持たない。

## Verification seams and regression gate

| Requirement | Seam | Verification |
|---|---|---|
| U04-PERF-01/02/03 | fake app-server/clock/process | count、remaining deadline、close/wait、residual process 0 |
| U04-PERF-04/05 | launch/process trace | parent 1、role n、generic config 1 |
| U04-PERF-06/08 | operation/object/buffer observer | generated size ladder、raw retention 0 |
| U04-PERF-07 | stdin port | write/EOF各1 |
| U04-PERF-09 | capture lifecycle trace | start→checkpoint→arm→terminal→join/seal |

parent 0/2件以上、Unit別`codex exec`、45秒超過、app-server残留、EOF欠落、capture-before-arm違反、terminal前seal、quadratic join、raw全量保持、role config複製をmerge blockerにする。
