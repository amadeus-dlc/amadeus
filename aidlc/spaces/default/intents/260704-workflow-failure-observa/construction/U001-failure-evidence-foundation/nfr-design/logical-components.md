# Logical Components: U001-failure-evidence-foundation

## 上流文脈

この logical-components は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、Telemetry facade、Error Audit、Hook Drop Doctor、Doctor Composition の処理予算を定義している。

`security-requirements` は、file-backed evidence、stdout JSON 非干渉、secret 非表示を定義している。

`scalability-requirements` は、bounded summary、verbose detail 分離、low-cardinality telemetry attribute を定義している。

`reliability-requirements` は、audit append failure、malformed drops、telemetry failure の fault isolation を定義している。

`tech-stack-decisions` は、Bun、TypeScript、Telemetry Facade、標準 file API、deterministic fixture を採用する判断を定義している。

`business-logic-model` は、command execution、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の処理順序を定義している。

## Component Inventory

| Component | Responsibility | Failure domain |
|---|---|---|
| Shared Contracts | `EvidenceRef`、`DiagnosticFinding`、`TelemetryScope`、stdout JSON contract を共有する。 | type and contract |
| Error Audit | error directive と top-level catch の `ERROR_LOGGED` fields を構築する。 | audit write |
| Hook Drop Doctor | `.aidlc-hooks-health/*.drops` を summary と warning finding に変換する。 | file parse |
| Telemetry Core | OpenTelemetry facade、no-op default、test exporter seam を提供する。 | telemetry recording |
| Doctor Composition | diagnostic findings を standard output と verbose detail に分ける。 | human-readable rendering |

## Component Boundaries

Shared Contracts は file I/O を持たない。

Error Audit は telemetry exporter を扱わない。

Hook Drop Doctor は hook 実行そのものを扱わない。

Telemetry Core は collector、dashboard、cloud export を所有しない。

Doctor Composition は directive/report の stdout JSON contract に接続しない。

## Interaction Model

AI-DLC CLI Tooling Service は command context を Shared Contracts の型へ変換する。

AI-DLC CLI Tooling Service は Telemetry Core から no-op default の scope を受け取る。

Error Audit は error evidence を `ERROR_LOGGED` field へ変換し、audit adapter へ渡す。

Hook Drop Doctor は `.drops` file を読み、Hook Drop Summary と warning finding を返す。

Doctor Composition は Error Audit、Hook Drop Doctor、Telemetry Core の結果を standard output と verbose detail に分ける。

## Blast Radius

| Failure | Containment |
|---|---|
| Error Audit write failure | telemetry と doctor summary へ波及させない。 |
| Hook Drop Doctor parse failure | malformed file の warning に限定する。 |
| Telemetry recording failure | stdout JSON と audit append を壊さない。 |
| Doctor verbose detail failure | standard summary を先に返す。 |
| OpenTelemetry exporter 未設定 | no-op default として扱い、network export しない。 |

## Infrastructure Bridge

Infrastructure Design へ渡す component は、cloud resource ではなく CLI 内 logical component である。

新しい AWS service、database、message broker、container orchestration は必要ない。

file-backed evidence surface は既存 workspace の file permission 境界に従う。

OpenTelemetry collector、dashboard、cloud telemetry export infrastructure は U001 の外に置く。

AWS Well-Architected の観点では、今回の bridge は operational excellence、security、reliability、performance efficiency を local tooling の設計で満たす。

## Verification Mapping

| Component | Verification |
|---|---|
| Shared Contracts | typecheck and JSON parse assertions |
| Error Audit | error directive and top-level catch audit fixture |
| Hook Drop Doctor | missing directory and malformed drops fixture |
| Telemetry Core | no-op default no-send and test exporter assertion |
| Doctor Composition | standard output snapshot and verbose detail separation |

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Logical components は NFR pattern を `.agents/aidlc/tools` 内の component 境界へ写している。

Infrastructure Design に cloud resource を要求せず、U001 の embedded CLI/tooling 境界を維持している。
