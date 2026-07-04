# Performance Requirements: U002-subagent-status-audit

## 上流文脈

この performance-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、hook payload から trustworthy status field を読み、success、failure、unknown を分類する処理を定義している。

`business-rules` は、top-level `subagent_status` と `status` だけを trusted source とし、message text から推測しない不変条件を定義している。

`requirements` は、R004、R007、R008、R009、NFR001、NFR004、NFR005 を定義している。

## Performance Targets

| ID | Target | Measurement |
|---|---|---|
| PERF001 | `classifySubagentStatus` は 1 payload あたり p95 で 2ms 以内に完了する。 | success、failure、unknown fixture benchmark |
| PERF002 | old audit row と new audit row の normalization は 1000 rows で p95 100ms 以内に完了する。 | audit row matrix fixture |
| PERF003 | `SUBAGENT_COMPLETED` additive fields の構築は p95 で 5ms 以内に完了する。 | audit fields fixture |
| PERF004 | stdout JSON parse test は Subagent Status path を有効にしても成功する。 | JSON parse assertion |
| PERF005 | audit append failure fixture は再試行 storm を起こさず、1 回の failed result で戻る。 | failed append fixture |

## Latency Budget

| Segment | Budget |
|---|---:|
| hook payload schema validation | 2ms p95 |
| trusted status allowlist matching | 1ms p95 |
| audit fields construction | 5ms p95 |
| old/new row normalization per 1000 rows | 100ms p95 |

U002 は hook event 処理であり、重い audit scan を分類 path に入れない。

## Resource Constraints

message text と transcript の全文解析は行わない。

outcome 判定は top-level fields と allowlist matching に限定する。

old row compatibility は missing outcome を unknown として扱い、migration 処理を実行しない。

## Verification

PERF001 は success、failure、missing status、untrusted field の fixture で確認する。

PERF002 は old row と new row の matrix で確認する。

PERF003 は additive field construction の deterministic test で確認する。

PERF004 は stdout JSON parse test で確認する。

PERF005 は audit append failure fixture で確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Performance target は payload 分類と audit row normalization に限定されている。

message text 解析を行わないため、性能と誤分類リスクの両方を抑えている。
