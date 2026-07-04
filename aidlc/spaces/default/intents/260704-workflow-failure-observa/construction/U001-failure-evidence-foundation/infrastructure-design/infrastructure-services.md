# Infrastructure Services: U001-failure-evidence-foundation

## 上流文脈

この infrastructure-services は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、Telemetry facade、Error Audit、Hook Drop Doctor、Doctor Composition の処理予算を定義している。

`security-design` は、file-backed evidence、stdout JSON 非干渉、secret 非表示、OpenTelemetry no-op default の保護境界を定義している。

`scalability-design` は、`.drops` file、audit row、telemetry attribute の増加対象を定義している。

`reliability-design` は、missing `.drops` directory、malformed drops、audit append failure、telemetry failure の隔離を定義している。

`logical-components` は、Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の責務を定義している。

`components` は、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition を component として定義している。

`services` は、AI-DLC CLI Tooling Service、Evidence Recording Service、Doctor Diagnostic Service、Telemetry Core Service を logical service として定義している。

`business-logic-model` は、file-backed evidence surface と adapter の接続点を定義している。

## Service Selection

U001 は database、cache、message queue、search service、CDN、DNS、load balancer を新設しない。

必要な infrastructure service は、既存 workspace の file-backed surface と in-process module である。

| Service surface | 役割 | 所有 component | Infrastructure decision |
|---|---|---|---|
| Audit shard | `ERROR_LOGGED` evidence を追記する。 | Error Audit | 既存 Intent audit を使う。 |
| `.aidlc-hooks-health/*.drops` | hook drop の証拠を保持する。 | Hook Drop Doctor | 既存 file surface を読む。 |
| OpenTelemetry facade | command span、error span、doctor metrics の call shape を統一する。 | Telemetry Core | no-op default と test exporter seam に限定する。 |
| Doctor output model | 標準表示と verbose detail を分ける。 | Doctor Composition | human-readable output と JSON stdout を分離する。 |
| Shared Contracts | evidence ref、finding、telemetry scope を共有する。 | Shared Contracts | in-process 型として提供する。 |

## Database and Cache

U001 は database を追加しない。

Audit Trail は既存の append-only Markdown shard を使う。

Hook drop は既存の `.drops` file を読む。

Cache layer は追加しない。

性能要求は cache ではなく bounded read と summary aggregation で満たす。

## Messaging and Service Discovery

U001 は message broker を追加しない。

Command と component は同期的な in-process call で連携する。

Service discovery は不要である。

Logical service boundary は TypeScript module と typed interface で表す。

## External Integrations

OpenTelemetry collector は core 計装の必須 integration にしない。

Dashboard hosting は必須 integration にしない。

Network export は明示設定がある場合だけ後続拡張として扱う。

U001 の検証では、test exporter seam と no-op default no-send を使う。

## Security Controls

File-backed evidence は target workspace の既存 file permission 境界に従う。

Audit event fields は additive にし、既存 event 名を削除または改名しない。

Malformed `.drops` は warning finding に変換し、例外で command を落とさない。

Telemetry attribute は低感度、低 cardinality の command name、stage、Intent ref に限定する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:01:20Z

Iteration: 1

U001 の infrastructure services は、既存 workspace と CLI 内 module に限定されている。

Database、cache、queue、load balancer を新設しない判断は、U001 の NFR と一致している。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| AmadeusValidator | PASS | Intent record の構造条件を満たしている。 |
| required-sections | PASS | Markdown structure は stage sensor 条件を満たしている。 |
| upstream-coverage | PASS | `performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` への参照がある。 |
