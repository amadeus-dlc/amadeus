# Performance Design: U002-subagent-status-audit

## 上流文脈

この performance-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、payload classification、old/new row normalization、additive field construction、stdout JSON parse、audit append failure の性能目標を定義している。

`security-requirements` は、free text を trusted source にしないことと message excerpt の最小化を定義している。

`scalability-requirements` は、payload field access と audit row normalization の成長境界を定義している。

`reliability-requirements` は、success、failure、unknown、old row compatibility、audit append failure の検証条件を定義している。

`tech-stack-decisions` は、TypeScript の pure helper と追加 package なしの実装方針を定義している。

`business-logic-model` は、trustworthy status field から `SubagentOutcome` を作り、`SUBAGENT_COMPLETED` の additive field へ渡す流れを定義している。

## Performance Architecture

| Area | Design | Target |
|---|---|---|
| payload classification | top-level `subagent_status` と top-level `status` だけを見る pure helper にする。 | PERF001 |
| old/new row normalization | reader helper で missing outcome を unknown に正規化する。 | PERF002 |
| additive fields | outcome、source、evidence ref を小さな object として構築する。 | PERF003 |
| stdout JSON | classification result と diagnostics を stdout に出さない。 | PERF004 |
| audit append failure | retry storm を作らず、1 回の failed result で返す。 | PERF005 |

## Processing Design

`classifySubagentStatus` は hook payload 1 件だけを入力にする。

`hook_event_name` が `SubagentStop` ではない場合は unknown にする。

`tool_input.status`、message text、transcript、last assistant message は分類に使わない。

success allowlist と failure allowlist は shared contract に置く。

old row compatibility は audit reader 側の normalization に置き、既存 row を書き換えない。

## Budget Allocation

| Segment | Design budget |
|---|---:|
| hook payload schema validation | 2ms p95 |
| trusted status allowlist matching | 1ms p95 |
| audit fields construction | 5ms p95 |
| old/new row normalization per 1000 rows | 100ms p95 |

## Optimization Strategy

Classification path に audit scan を入れない。

Message text の全文解析をしない。

Outcome は success、failure、unknown の 3 状態だけにする。

Old row compatibility は migration ではなく read path の正規化で扱う。

## Verification Design

success、failure、missing status、untrusted field の fixture で PERF001 を確認する。

old row と new row の matrix で PERF002 を確認する。

additive field construction の deterministic test で PERF003 を確認する。

stdout JSON parse test で PERF004 を確認する。

audit append failure fixture で PERF005 を確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Performance design は payload classification と audit row normalization に限定されている。

free text 解析をしないため、性能劣化と誤分類の両方を避けられる。
