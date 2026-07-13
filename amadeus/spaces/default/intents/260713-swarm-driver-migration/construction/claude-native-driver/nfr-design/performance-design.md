# Claude Native Driver Performance Design

## 入力契約と測定境界

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。対象はC-05のprobe、execution/capture plan構築、exact-path observer用projection、stream/state/hook normalizationである。Claude実行時間、model latency、token消費、native scheduler性能にはSLOを置かない。

`n`をexpected Unit数、`e`をallowlist stream/hook event数、`s`をprovider-state row数とする。

## Processing pipeline

| Component | Algorithm | Time | Additional memory | Provider process ownership |
|---|---|---:|---:|---:|
| `ClaudeResolveScope` | common probe Promiseをscope内だけ共有 | common 1回、mode各最大1回 | `O(1)` | 0 |
| `ClaudeSessionPrefixAllocator` | 256候補のlock/path direct lookup | `O(k)`、`k<=256` | `O(1)` | 0 |
| `ClaudeBatchManifestProjector` | Unit stable sort + stdin bytes生成 | `O(n log n)` | `O(n)` | 0 |
| `ClaudeExecutionPlanFactory` | fixed argv/env/settings/capture shape構築 | `O(n)` | `O(n)` | 0 |
| Teams/Ultra state projector | exact pathのallowlist rowをsingle pass | `O(s)` | `O(s)` | 0 |
| stream/hook parser | eventごとの逐次allowlist projection | `O(e)` | accepted event `O(e)` | 0 |
| evidence correlator | key index + canonical sort +全単射 | `O((n+e+s) log(n+e+s))`以下 | `O(n+e+s)` | 0 |

common probeはfresh resolve scope内だけで共有する。attempt/batch/global cacheに昇格せず、resumeはCLI/auth/mode/hook probeを再実行する。

## Probe and capture budgets

| Probe | Deadline | Cleanup requirement |
|---|---:|---|
| `claude --version` | 5秒 | child/group残留0 |
| `claude auth status` | 10秒 | raw auth detail破棄 |
| stream handshake + sentinel hook | 30秒 | scratch隔離/削除 |
| common + selected mode total | 45秒以下 | timeout child/group残留0 |

期限は能力検査だけへ適用し、Unit実行latencyへ流用しない。U-02はcapture plan/identityをcheckpointへ保存し、capture start exactly 1とstarted acknowledgementを確認後にproviderをarmする。provider group terminal後、capture `stopAndWait` exactly 1が完了するまでnormalize/verdictへ進まない。

## I/O and allocation decisions

- Agent Teamsは予約済みteam/task exact pathだけ、Ultraはstream-bound run exact pathだけを読む。root listing、mtime newest、recursive scanは0件とする。
- hookはeventごとのexclusive-create fileを使い、single JSONL lockとwriter contentionを作らない。
- provider stdout/stderr全体をbufferせず、allowlist eventへ逐次projectする。prompt、script、assistant resultはmemory fixtureへ残さない。
- canonical manifest/state/eventはkeyで一度indexし、Unit×event×stateのcross-productを作らない。
- waveごとのClaude coordinator processはexactly 1件で、C-05はprocess supervisor/worker poolを所有しない。

## Verification seams and regression gate

| Requirement | Seam | Verification |
|---|---|---|
| U03-PERF-01/02 | resolve-scope probe port | common/mode spy count、resume fresh scope |
| U03-PERF-03 | fake clock/process | timeout/kill/wait trace |
| U03-PERF-04 | U-02 launch trace | waveごとの`claude -p` count |
| U03-PERF-05/06 | filesystem/lock spy | exact lookup count、root listing 0、256停止 |
| U03-PERF-07/08 | operation/object counter | generated size ladder、raw buffer 0 |
| U03-PERF-09 | capture/provider lifecycle trace | start→checkpoint→arm→terminal→join順序 |

root scan、raw全量buffer、quadratic join、Unitごとの`claude -p`、cross-attempt cache、capture開始前arm、terminal前joinのいずれかをmerge blockerにする。cache service、queue、worker pool、connection poolは非適用である。
