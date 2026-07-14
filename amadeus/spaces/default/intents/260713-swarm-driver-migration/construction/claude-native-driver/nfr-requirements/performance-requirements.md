# Claude Native Driver Performance Requirements

## 上流と測定境界

本成果物はU-03の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。測定対象はClaude adapter familyのprobe、launch/capture plan構築、exact-path observer、stream normalization、Unit-child evidence projectionである。providerのUnit実行時間、model latency、token消費には数値SLOを置かない。

`n`をexpected Unit数、`e`をallowlist stream/hook event数、`s`をprovider-state task/agent row数とする。

## Quantified requirements

| ID | Metric | Target | 条件 | 検証 |
|---|---|---:|---|---|
| U03-PERF-01 | common CLI/auth probe | 同一resolve scopeでexactly 1回 | 2 mode view評価 | spy count |
| U03-PERF-02 | mode probe | evaluated modeごとに最大1回 | 1 attempt | spy count |
| U03-PERF-03 | probe deadline | CLI 5秒、auth 10秒、handshake/hook 30秒、total 45秒以下 | unavailable/hung fake CLI | fake clock/process timeout |
| U03-PERF-04 | coordinator process | selected batch/waveごとにexactly 1件。Agent Teamsはinteractive `claude`、Ultra Codeはheadless `claude -p` | native dispatch | transport別process trace |
| U03-PERF-05 | state path lookup | expected exact pathのみ、root directory listing 0件 | Teams/Ultra observer | filesystem spy |
| U03-PERF-06 | session prefix allocation | 最大256 candidate、各candidateのlock/team/task probe最大1回 | collision worst case | operation count |
| U03-PERF-07 | normalization/binding | time `O((n+e+s) log(n+e+s))`以下、追加memory `O(n+e+s)`以下 | order-independent evidence | counter/property test |
| U03-PERF-08 | raw stream retention |全stream buffer 0件、allowlist eventの逐次projection | provider execution | memory/port spy |
| U03-PERF-09 | capture lifecycle | capture start 1、stopAndWait 1、provider arm前started 100% |各native wave | lifecycle trace |

## Resource and contention constraints

- common probeのPromiseはfresh resolve scope内だけで共有し、attempt/batch横断cacheを持たない。
- Agent Teamsのteam/task rootやUltraのproject rootをscanせず、session/run bindingからexact pathだけを読む。
- hookはeventごとのexclusive-create fileを使い、並行writerが単一JSONL lockを競合しない。
- raw provider JSON、prompt、script、resultをmemoryまたはfixtureへ蓄積しない。
- C-05はobserver/process supervisor/worker poolを所有せず、pure `AdapterExecutionPlan`とnormalizerに限定する。

## Regression gate

次をmerge blockerにする。

1. 同一resolve scopeでcommon probeが2回以上、またはattempt間でprobeが再利用される。
2. batch/waveでClaude coordinatorが0件または2件以上起動する。
3. provider armがcapture started checkpointより先に起きる。
4. exact-path lookupがroot scan/mtime newest fallbackへ退行する。
5. Unit/event/state処理がquadratic cross-productまたはraw-stream全量保持になる。
6. probe timeout後もchild/process groupが残る。

## 非目標

Claude service latency、Unit成果物生成時間、Agent Teams／workflow内部schedulerの最適化、token budgetはU-03のperformance targetではない。speedのためにprovider-state + streamのAND検証、capture join、referee gateを省略しない。
