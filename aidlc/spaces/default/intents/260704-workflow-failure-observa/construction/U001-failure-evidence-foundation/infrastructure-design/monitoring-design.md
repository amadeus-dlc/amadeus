# Monitoring Design: U001-failure-evidence-foundation

## 上流文脈

この monitoring-design は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、Telemetry facade creation、Error Audit field construction、Hook Drop Doctor summary、Doctor Composition の処理予算を定義している。

`security-design` は、標準表示へ secret、token、full stack trace を混ぜない方針を定義している。

`scalability-design` は、standard summary と verbose detail の分離を定義している。

`reliability-design` は、telemetry recording failure が stdout JSON contract と audit append を壊さない方針を定義している。

`logical-components` は、Telemetry Core、Error Audit、Hook Drop Doctor、Doctor Composition の監視対象を定義している。

`components` は、Telemetry Core を OpenTelemetry core 計装の所有 component として定義している。

`services` は、Telemetry Core Service と Doctor Diagnostic Service を logical service として定義している。

`business-logic-model` は、command lifecycle、error evidence、doctor evidence、OpenTelemetry core 計装の流れを定義している。

## Metrics and KPIs

U001 の metrics は、local CLI の診断と検証に使う。

| Metric | 目的 | Source | Required behavior |
|---|---|---|---|
| command span count | command lifecycle の観測点を確認する。 | Telemetry Core | no-op default では外部送信しない。 |
| error evidence count | `ERROR_LOGGED` の発生を確認する。 | Error Audit | active workflow がある場合だけ audit に残す。 |
| hook drop count | hook drop の表面化を確認する。 | Hook Drop Doctor | hook name ごとに count と latest を集約する。 |
| malformed drop warning count | 壊れた `.drops` の影響を隔離する。 | Hook Drop Doctor | warning finding に変換する。 |
| doctor warning count | operator が見るべき warning を数える。 | Doctor Composition | standard output と verbose detail を分ける。 |

KPI は、deterministic fixture で stdout JSON parse、no-op default no-send、doctor no-crash が 100% 通ることである。

## Log Strategy

U001 は新しい log aggregation service を追加しない。

Error evidence は `ERROR_LOGGED` audit row として append-only に残す。

Hook drop evidence は `.aidlc-hooks-health/*.drops` を source とし、doctor が summary を表示する。

JSON stdout command は human-readable diagnostics を stdout に出さない。

Human-readable diagnostics は doctor output に限定する。

## Tracing Configuration

OpenTelemetry core 計装は facade 経由で呼び出す。

Default は no-op である。

Exporter が明示設定されない限り、network export、collector 接続、background flush worker を作らない。

Test exporter seam は deterministic test 専用に使う。

Trace attribute は command name、stage、Intent ref の低 cardinality 属性に限定する。

## Alert and Dashboard Design

U001 は外部 alert service と dashboard hosting を必須にしない。

Alert 相当の表面化は、doctor warning、CI failure、PR checklist の未完了項目で扱う。

Dashboard 相当の一覧は、Intent artifact と PR readiness checklist で扱う。

Collector や dashboard が必要になった場合は、core 計装とは別の後続 Intent として扱う。

## Incident Response

U001 は production incident response pipeline を追加しない。

調査入口は、audit shard、doctor output、`.drops` summary、test result、Intent artifact である。

Audit append failure は再帰記録せず、command failure として表面化する。

Telemetry failure は command の主処理を失敗させない。

Malformed drops は warning finding に変換して doctor を継続する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:01:20Z

Iteration: 1

U001 の monitoring design は、OpenTelemetry の core 計装を必須とし、collector と dashboard を任意境界に置いている。

stdout JSON 契約と human-readable doctor output の分離も維持されている。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| AmadeusValidator | PASS | Intent record の構造条件を満たしている。 |
| required-sections | PASS | Markdown structure は stage sensor 条件を満たしている。 |
| upstream-coverage | PASS | `performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` への参照がある。 |
