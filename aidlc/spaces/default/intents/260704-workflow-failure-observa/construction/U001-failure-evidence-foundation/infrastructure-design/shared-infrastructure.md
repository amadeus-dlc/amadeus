# Shared Infrastructure: U001-failure-evidence-foundation

## 上流文脈

この shared-infrastructure は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、U001 の shared surface を lightweight facade、bounded summary、stdout JSON 非干渉として定義している。

`security-design` は、shared surface に secret、token、full stack trace を混ぜない方針を定義している。

`scalability-design` は、audit row と `.drops` file の成長を shared surface として扱う方針を定義している。

`reliability-design` は、shared surface の failure を相互に波及させない方針を定義している。

`logical-components` は、Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition を shared logical component として定義している。

`components` は、C001 から C008 までの component ownership と out of scope を定義している。

`services` は、S001 から S005 までの logical service boundary と communication contracts を定義している。

`business-logic-model` は、U003 が U001 evidence を read-only に読む前提を定義している。

## Shared Surface

U001、U002、U003 は同じ deployable infrastructure を共有しない。

共有するのは、target workspace 内の evidence surface と TypeScript module boundary である。

| Shared surface | U001 role | Other Unit relationship |
|---|---|---|
| Shared Contracts | evidence ref、diagnostic finding、telemetry scope を定義する。 | U002 と U003 が同じ status と evidence ref を使う。 |
| Audit shard | `ERROR_LOGGED` を append する。 | U002 が `SUBAGENT_COMPLETED` status を append し、U003 が read-only に読む。 |
| `.aidlc-hooks-health/*.drops` | Hook Drop Doctor が summary を作る。 | U003 が workflow warning の入力として参照できる。 |
| OpenTelemetry facade | command span、error span、doctor metrics を統一する。 | U002 と U003 が同じ no-op default 境界を使う。 |
| Intent artifact | verification evidence と PR readiness の参照先になる。 | U003 が traceability evidence として読む。 |

## Ownership Boundaries

U001 は Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の実行時基盤を所有する。

U002 は subagent status audit の追加 fields と分類を所有する。

U003 は workflow warning と PR readiness traceability を read-only consumer として所有する。

Error Audit と Subagent Status は Verification Traceability から呼ばれない。

Verification Traceability は Error Audit と Subagent Status の evidence を読むだけである。

## Access and Mutation Rules

Audit shard は append-only として扱う。

`aidlc-state.md` と `runtime-graph.json` は、doctor warning の検出では read-only に扱う。

`.aidlc-hooks-health/*.drops` は Hook Drop Doctor が読むだけで、hook 実行そのものは変更しない。

OpenTelemetry facade は exporter 未設定時に no-op とし、外部送信を行わない。

Shared Contracts は file I/O を持たない。

## Cost and Sustainability

新しい cloud resource を作らないため、追加の AWS cost は発生しない。

CI cost は deterministic fixture の実行時間に限定される。

Collector、dashboard、always-on export を必須化しないため、core 計装の導入時点では常時稼働 resource を増やさない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:01:20Z

Iteration: 1

U001 の shared infrastructure は、後続 Unit が使う evidence surface と module boundary を明確にしている。

Cloud shared infrastructure を作らず、配布物境界と audit 境界を保っている。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| AmadeusValidator | PASS | Intent record の構造条件を満たしている。 |
| required-sections | PASS | Markdown structure は stage sensor 条件を満たしている。 |
| upstream-coverage | PASS | `performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` への参照がある。 |
