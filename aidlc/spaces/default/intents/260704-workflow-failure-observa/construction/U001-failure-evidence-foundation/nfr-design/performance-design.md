# Performance Design: U001-failure-evidence-foundation

## 上流文脈

この performance-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、Telemetry facade、Error Audit、Hook Drop Doctor、Doctor Composition の p95 目標を定義している。

`security-requirements` は、stdout JSON 非干渉、secret 非表示、file-backed evidence の扱いを定義している。

`scalability-requirements` は、`.drops` file と audit row の増加に対する bounded summary を定義している。

`reliability-requirements` は、audit append failure、malformed drops、telemetry failure の隔離を定義している。

`tech-stack-decisions` は、既存の Bun と TypeScript を維持し、OpenTelemetry は facade の背後に置く判断を定義している。

`business-logic-model` は、command execution から telemetry、audit、doctor output へ進む処理順序を定義している。

## Performance Architecture

| Area | Design | Target |
|---|---|---|
| Telemetry facade | command 開始時に一度だけ facade を作り、no-op default では軽量な scope object を返す。 | PERF001 |
| Error Audit | error directive と top-level catch は field construction を pure helper に寄せる。 | PERF002 |
| no active workflow | active workflow がない場合は record lookup 後に no-op result を返す。 | PERF003 |
| Hook Drop Doctor | `.aidlc-hooks-health/*.drops` は hook ごとに count と latest を集約する。 | PERF004 |
| malformed drops | malformed entry は warning finding に変換し、retry loop を作らない。 | PERF005 |
| stdout JSON | JSON stdout command は telemetry と audit の診断文を stdout に書かない。 | PERF006 |

## Processing Design

Telemetry facade は、command context、stage、Intent ref を受け取る。

no-op default では exporter、network connection、background flush worker を作らない。

test exporter seam は deterministic test 専用の注入点にする。

Error Audit は、error detail を最小 field に整形してから audit adapter へ渡す。

Hook Drop Doctor は、standard summary と verbose detail を別構造にする。

Doctor Composition は、標準表示の section を先に作り、詳細情報の展開を後段に分ける。

## Budget Allocation

| Segment | Design budget |
|---|---:|
| Telemetry facade creation | 5ms p95 |
| Error evidence field construction | 5ms p95 |
| Audit append call overhead excluding file system latency | 10ms p95 |
| Hook drop summary for normal fixture | 1000ms p95 |
| Doctor output model composition | 50ms p95 |

host environment の file system latency は設計対象の制御外である。

そのため、fixture size と adapter 内処理量を固定して検証する。

## Optimization Strategy

Telemetry attribute は low-cardinality な command name、stage、Intent ref に限定する。

Hook Drop Doctor は full history を標準表示へ載せない。

Audit row の重い scan は U001 の command path に入れない。

Performance optimization は cache ではなく、bounded read と summary 分離で扱う。

## Verification Design

OpenTelemetry exporter 未設定時の no-send fixture で PERF001 を確認する。

error directive と top-level catch の deterministic fixture で PERF002 を確認する。

no active workflow fixture で PERF003 を確認する。

100 files、各 100 lines の `.drops` fixture で PERF004 を確認する。

malformed drops fixture で PERF005 を確認する。

JSON parse assertion で PERF006 を確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Performance design は local CLI tooling の処理量に限定されている。

OpenTelemetry collector、dashboard、cloud export を性能設計に含めていない。
