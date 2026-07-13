# Kiro Native Driver Performance Requirements

## 上流と測定境界

本成果物はU-05の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。測定対象はbalanced split、probe、runtime agent materialization、wave launch、session inventory/projection、Unit-role-child bindingである。Kiro Unit実行時間、model latency、token消費には数値SLOを設定しない。

`n`をexpected Unit数、`w=ceil(n/4)`をwave数、`f`をbaseline後のallowlist session file数、`r`をprojected session row数とする。

## Quantified requirements

| ID | Metric | Target | 条件 | 検証 |
|---|---|---:|---|---|
| U05-PERF-01 | capability probe | 1 resolve scopeでexactly 1回、attempt外cache 0件、total 45秒以下 | resolve/resume | fake clock/process spy |
| U05-PERF-02 | balanced split | time `O(n)`、追加memory `O(n)`、wave count `ceil(n/4)` |全`n>=2` | property/operation count |
| U05-PERF-03 | wave size |各2〜4、max-min 1以下、flatten exact |全batch | property test |
| U05-PERF-04 | parent process | waveごとに`kiro-cli chat` exactly 1件 | native dispatch | process trace |
| U05-PERF-05 | concurrent child | waveごとにexpected Unitと同数の2〜4件、extra 0 | session evidence | cardinality test |
| U05-PERF-06 | wave concurrency | active wave最大1件、次wave armは前waveのC-08/C-11 green後 | multi-wave | conductor trace |
| U05-PERF-07 | session projection | time `O((f+r) log(f+r))`以下、追加memory `O(f+r)`以下 | baseline/new session | operation/object count |
| U05-PERF-08 | stdin lifecycle | manifest write exactly 1回、EOF exactly 1回/wave | success/failure | write/close spy |
| U05-PERF-09 | raw session retention | raw file/message/summary/tool I/O buffer 0件 | capture seal | projection scan |

各probe stepは総45秒の残りdeadlineを超えない。30秒behavior handshakeは別枠のruntime SLOではない。

## Resource and contention constraints

- balanced splitはinput orderのsingle pass/連続sliceで構築し、dynamic rebalancingを行わない。
- waveはserialに実行し、同一projectへ複数parent waveを同時armしない。
- runtime parent/worker configはwave/Unitごとに必要な1件だけをmaterializeし、terminal/capture seal後にcleanupする。
- session parserはbaseline後のallowlist suffixだけをprojectionし、raw conversationをmemory/fixtureへ複製しない。
- C-07は独自supervisor、daemon、queue、remote schedulerを作らない。

## Regression gate

次をmerge blockerにする。

1. waveが1件/5件以上、差2以上、drop/duplicate/reorderになる。
2. 1 waveでparent 0件/2件以上、または2 waveが同時activeになる。
3. 前waveのC-08/C-11 green前に次waveをarmする。
4. session inventory/projectionがquadraticまたはraw session全量保持になる。
5. probe total 45秒超過、timeout後process残留、stdin EOF欠落。

## 非目標

Kiro service throughput、internal scheduler、Unit成果生成時間、token budget、wave間dynamic rebalancingはU-05のperformance targetではない。speedのためにwave gate、terminal session evidence、C-11 checkを省略しない。
