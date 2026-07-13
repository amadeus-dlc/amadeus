# Codex Native Driver Performance Requirements

## 上流と測定境界

本成果物はU-04の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。測定対象はapp-server probe、behavior handshake、role/argv/capture plan構築、JSONL/hook normalization、Unit-role-child bindingである。Codex native batchのwall-clock時間、model latency、token消費には数値SLOを設定しない。

`n`をexpected Unit/role数、`j`をallowlist JSONL/collaboration item数、`h`をhook record数とする。

## Quantified requirements

| ID | Metric | Target | 条件 | 検証 |
|---|---|---:|---|---|
| U04-PERF-01 | capability probe | 1 resolve scopeでexactly 1回、attempt外cache 0件 | resolve/resume | process/spy count |
| U04-PERF-02 | probe deadlines | CLI/app-server/config各5秒、catalog/auth/hook各10秒、handshake 30秒、candidate total 45秒以下 | hung/missing fake | fake clock |
| U04-PERF-03 | app-server lifetime | 1 probe connection、必要response後stdin close/wait、daemon 0件 | 全probe | process trace |
| U04-PERF-04 | native parent process | batchごとに`codex exec --json` exactly 1件 | 2 Unit以上 | process trace |
| U04-PERF-05 | dynamic role registration | exactly `n` role、generic config fileは1件共有 | native launch | argv/config count |
| U04-PERF-06 | normalization/bijection | time `O((n+j+h) log(n+j+h))`以下、追加memory `O(n+j+h)`以下 | order/duplicate fixture | operation/object count |
| U04-PERF-07 | stdin lifecycle | manifest write exactly 1回、EOF exactly 1回 | success/failure | write/close spy |
| U04-PERF-08 | raw payload retention | raw JSONL/message/reasoning/transcript buffer 0件 | provider execution | memory/projection test |
| U04-PERF-09 | capture lifecycle | provider arm前start 100%、group terminal後join/seal 100% |各run | lifecycle trace |

各probe stepは総45秒の残りdeadlineを超えない。30秒handshakeはそれ単独で45秒へ加算する別budgetではない。

## Resource and contention constraints

- app-server/behavior probe resultはresolve scope内だけで保持し、resumeではfresh processを使う。
- collaboration/hook eventは逐次allowlist projectionし、agent messageやraw JSONL全体を保持しない。
- Unit-role-childはkeyed mapで一度indexし、全組合せscanを行わない。
- generic worker configをUnitごとに複製せず、dynamic role metadataだけをargvへ投影する。
- C-06は独自process supervisor、daemon、worker pool、queueを作らない。

## Regression gate

次をmerge blockerにする。

1. 1 batchでparent processが0件または2件以上、またはUnitごとの`codex exec`になる。
2. probe total 45秒超過、timeout後のapp-server/exec残留。
3. stdin EOF欠落、capture前arm、terminal前seal。
4. Unit/JSONL/hookのquadratic scan、raw payload全量保持。
5. role configのUnit数分複製、attempt外model/catalog cache。

## 非目標

Codex service throughput、Ultra modelの応答速度、subagent scheduler、Unit成果物生成時間、token budgetはU-04のperformance targetではない。performanceのためにexact model binding、terminal collaboration、hook、C-11 gateを省略しない。
