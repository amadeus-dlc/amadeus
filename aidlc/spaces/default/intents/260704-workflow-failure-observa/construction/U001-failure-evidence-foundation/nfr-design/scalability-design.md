# Scalability Design: U001-failure-evidence-foundation

## 上流文脈

この scalability-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、Hook Drop Doctor と Doctor Composition の処理予算を定義している。

`security-requirements` は、標準表示へ raw full history を混ぜない境界を定義している。

`scalability-requirements` は、`.drops` file、audit row、telemetry attribute の成長対象を定義している。

`reliability-requirements` は、malformed input と telemetry failure の隔離を定義している。

`tech-stack-decisions` は、追加 package を OpenTelemetry core 計装の最小範囲に限定する判断を定義している。

`business-logic-model` は、Hook Drop Entry から Hook Drop Summary へ変換する流れを定義している。

## Growth Model

U001 の成長対象は command 実行回数、audit row 数、`.drops` file 数、doctor inspection surface である。

U001 は deployable service ではないため、horizontal scaling、load balancer、database sharding は設計しない。

成長への対応は、bounded read、summary aggregation、verbose detail 分離で行う。

## Scaling Architecture

| Concern | Design | Trigger |
|---|---|---|
| `.drops` file 増加 | hook ごとに count、latest timestamp、latest reason へ集約する。 | SCALE001 |
| malformed entry 増加 | parse warning を DiagnosticFinding に変換する。 | SCALE002 |
| telemetry call 増加 | no-op scope は command 単位で軽量 object にする。 | SCALE003 |
| directive/report correlation | command pair 単位の trace attribute に限定する。 | SCALE004 |
| audit evidence 増加 | U001 は append-only write と summary read に限定し、U003 が read-only に集約する。 | SCALE005 |

## Capacity Boundaries

`.drops` fixture は 100 files、各 100 lines を基準にする。

Malformed entry は全体の 10% まで混在する fixture を基準にする。

Standard doctor output は hook ごとの summary と warning count を優先する。

Verbose detail は標準表示から分ける。

OpenTelemetry attributes は low-cardinality に限定する。

## Degradation Design

Doctor summary が予算を超える場合、full history 表示を増やさず summary aggregation を見直す。

Malformed `.drops` entry が増えた場合、warning count を増やして処理を継続する。

Telemetry failure が起きた場合、command の主処理と stdout JSON contract を優先する。

Audit append failure が起きた場合、再帰的 error audit を起こさない。

## AWS Platform Boundary

U001 は cloud workload ではない。

AWS runtime infrastructure、collector deployment、dashboard hosting、cloud telemetry export infrastructure は設計しない。

AWS Well-Architected の観点では、operational excellence と observability boundary を local tooling の範囲で満たす。

Infrastructure Design へ渡す logical component は、cloud resource ではなく CLI 内 component と file-backed evidence surface である。

## Verification Design

100 files、各 100 lines の `.drops` fixture で summary aggregation を確認する。

Malformed entry 10% fixture で warning conversion を確認する。

No-op telemetry fixture で command ごとの setup が増殖しないことを確認する。

Trace attribute fixture で command pair 単位の correlation を確認する。

Integration fixture で U003 が U001 evidence を read-only に集約できることを確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Scalability design は local file-backed evidence surface に限定されている。

cloud scaling と database partitioning を要求しないため、U001 の scope boundary と一致している。
