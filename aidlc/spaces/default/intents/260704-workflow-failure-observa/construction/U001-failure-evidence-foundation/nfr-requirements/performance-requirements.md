# Performance Requirements: U001-failure-evidence-foundation

## 上流文脈

この performance-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、command execution、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の処理順序を定義している。

`business-rules` は、stdout JSON 契約、OpenTelemetry no-op default、malformed drops no-crash、audit write failure の不変条件を定義している。

`requirements` は、R001、R002、R003、R007、R008、R009 と NFR001、NFR002、NFR003、NFR004、NFR005、NFR006 を定義している。

U001 は local CLI tooling の Unit であり、HTTP response time や concurrent user target は対象外である。

## Performance Targets

| ID | Target | Measurement |
|---|---|---|
| PERF001 | OpenTelemetry no-op default の command span 開始と終了は、fixture command の p95 で 5ms 以内の追加時間に収める。 | test exporter disabled の deterministic benchmark |
| PERF002 | error directive の `ERROR_LOGGED` fields 構築は、p95 で 5ms 以内に完了する。 | deterministic error fixture |
| PERF003 | active workflow がない場合の Error Audit no-op path は、p95 で 2ms 以内に完了する。 | no active workflow fixture |
| PERF004 | `.aidlc-hooks-health/*.drops` 100 files、各 100 lines の summary は、p95 で 1000ms 以内に完了する。 | local fixture benchmark |
| PERF005 | malformed drops entry を含む summary は、正常 entry のみの場合と同じ order で完了し、throw による再試行を発生させない。 | malformed drops fixture |
| PERF006 | stdout JSON parse test は telemetry と audit path を有効にしても成功する。 | JSON parse assertion |

## Latency Budget

| Segment | Budget |
|---|---:|
| Telemetry facade creation | 5ms p95 |
| Error evidence field construction | 5ms p95 |
| Audit append call overhead excluding file system latency | 10ms p95 |
| Hook drop summary for normal fixture | 1000ms p95 |
| Doctor output model composition | 50ms p95 |

file system latency は host environment に依存するため、NFR は adapter 内の処理量と fixture size を固定して測る。

## Resource Constraints

Hook Drop Doctor は standard output に full history を載せない。

標準表示は hook ごとの summary だけを保持する。

verbose detail が必要な場合も、standard summary と別構造に分ける。

OpenTelemetry no-op default では exporter、network connection、background flush worker を起動しない。

## Verification

PERF001 は OpenTelemetry exporter 未設定の benchmark で確認する。

PERF002 と PERF003 は error directive と no active workflow fixture で確認する。

PERF004 と PERF005 は `.aidlc-hooks-health/*.drops` fixture で確認する。

PERF006 は `aidlc-orchestrate.ts next` と `report` の JSON parse test で確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Performance target は local CLI tooling と deterministic fixture に限定されている。

OpenTelemetry collector、dashboard、cloud export は performance target に含まれていない。
