# Performance Requirements: U003-workflow-warning-traceability

## 上流文脈

この performance-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、Conductor Warning、Doctor Composition、Verification Traceability、PR readiness checklist の処理順序を定義している。

`business-rules` は、doctor warning の非破壊性、pending question と approval gate の false positive 抑制、missing evidence の扱い、scope-out 境界を定義している。

`requirements` は、R005、R006、R007、R009、NFR001、NFR003、NFR004、NFR006 を定義している。

`technology-stack` は optional input であり、この Intent では個別成果物として存在しないため、既存の TypeScript と Bun の CLI 前提を上流技術制約として扱う。

U003 は local CLI tooling と Intent evidence の診断 Unit であり、HTTP response time や concurrent user target は対象外である。

## Performance Targets

| ID | Target | Measurement |
|---|---|---|
| PERF001 | doctor warning の report mismatch 検出は、100 stage artifacts と 1000 audit rows の fixture で p95 500ms 以内に完了する。 | deterministic state and audit fixture benchmark |
| PERF002 | in-flight abandonment 判定は、pending question と approval gate の evidence check を含めて p95 100ms 以内に完了する。 | pending question and gate fixture |
| PERF003 | `runtime-graph.json` と audit の contradiction check は、stage outcome、sensor result、memory entry の比較を p95 250ms 以内に完了する。 | runtime graph and audit fixture |
| PERF004 | Requirement evidence map は R001-R009 の 9 件を p95 50ms 以内に集約する。 | requirement evidence fixture |
| PERF005 | PR readiness checklist は Issue #431、#432、#433、#435 と verification result を p95 100ms 以内に集約する。 | PR readiness fixture |
| PERF006 | stdout JSON parse test は doctor warning と traceability path を有効にしても成功する。 | JSON parse assertion |

## Latency Budget

| Segment | Budget |
|---|---:|
| state and audit snapshot read excluding file system latency | 100ms p95 |
| report mismatch rule evaluation | 100ms p95 |
| abandonment false-positive guard | 100ms p95 |
| runtime graph contradiction comparison | 250ms p95 |
| Requirement evidence map composition | 50ms p95 |
| PR readiness checklist composition | 100ms p95 |

file system latency は host environment に依存するため、NFR は fixture size と rule evaluation の処理量を固定して測る。

## Resource Constraints

Doctor standard output は warning summary に限定する。

Verbose detail が必要な場合も、standard output と別構造に分ける。

Requirement evidence map は R001-R009 の固定集合を対象にし、PR readiness で無制限の audit scan を実行しない。

OpenTelemetry no-op default では exporter、network connection、background flush worker を起動しない。

## Verification

PERF001 は stage artifact と audit transition の差分 fixture で確認する。

PERF002 は pending question、approval gate、abandonment の 3 fixture で確認する。

PERF003 は `runtime-graph.json` と audit の contradiction fixture で確認する。

PERF004 と PERF005 は Requirement evidence map と PR readiness checklist の deterministic fixture で確認する。

PERF006 は doctor warning path と telemetry path を有効にした JSON parse test で確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Performance target は diagnostic tooling と traceability composition に限定されている。

外部 collector、dashboard、cloud export は performance target に含まれていない。
