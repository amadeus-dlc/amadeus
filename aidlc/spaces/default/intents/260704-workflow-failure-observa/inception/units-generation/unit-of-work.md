# Unit of Work

## 上流文脈

この unit-of-work は、`components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`、`stories` を入力として作成する。

`components` は、Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Subagent Status、Conductor Warning、Verification Traceability、Doctor Composition の 8 component を定義している。

`component-methods` は、各 component の public method group、logical service、ADR の対応を定義している。

`services` は、新しい deployable service を追加せず、`.agents/aidlc/tools` 内の embedded CLI/tooling module として扱う方針を定義している。

`component-dependency` は、Verification Traceability を evidence の read-only consumer として扱い、Error Audit と Subagent Status から Verification Traceability へ依存しない DAG を定義している。

`decisions` は、modular CLI/tooling architecture、OpenTelemetry no-op default、file-backed evidence surface、adapter-first parity、non-mutating doctor warning を採用している。

`requirements` は、R001-R009 と NFR001-NFR006 を定義している。

`stories` は、US001-US009 と Issue #431、#432、#433、#435、OpenTelemetry core 計装の対応を定義している。

## Unit 分割方針

Unit は、AI-DLC の stage cost を考慮して大きめに切る。

8 component をそのまま 8 Unit にせず、Construction で検証可能な 3 Unit に束ねる。

Unit は実装順ではなく、依存 DAG の節点として扱う。

実装順、value-first、risk-first、walking skeleton first の判断は Stage 2.8 Delivery Planning に残す。

すべての Unit は `.agents/aidlc/tools` 内の embedded CLI/tooling module として実装される。

新しい runtime service、AWS infrastructure、OpenTelemetry collector、dashboard、cloud export は Unit に含めない。

## Unit 一覧

| Unit | Name | Description | Complexity | Deployment model |
|---|---|---|---|---|
| U001 | failure-evidence-foundation | error audit、hook drop doctor、OpenTelemetry core、doctor composition、shared contracts を束ね、失敗証拠の最初の土台を作る。 | L | embedded CLI/tooling module |
| U002 | subagent-status-audit | subagent outcome の success、failure、unknown 分類と audit taxonomy compatibility を扱う。 | M | embedded CLI/tooling module |
| U003 | workflow-warning-traceability | conductor-independent doctor warning、Requirement evidence、PR readiness traceability を扱う。 | L | embedded CLI/tooling module |

## U001-failure-evidence-foundation

### 目的

U001 は、workflow 失敗を audit、doctor、OpenTelemetry core から観測できる最小の基盤を作る。

この Unit は、Issue #431、#432、OpenTelemetry core 計装を 1 つの大きめの vertical slice として扱う。

### 所有範囲

| Area | Included |
|---|---|
| Components | C001 Shared Contracts、C002 Error Audit、C003 Hook Drop Doctor、C004 Telemetry Core、C008 Doctor Composition |
| Method groups | Shared Contracts、Error Audit Methods、Hook Drop Doctor Methods、Telemetry Core Methods、Doctor Composition Methods |
| Logical services | S001 AI-DLC CLI Tooling Service、S002 Evidence Recording Service、S003 Doctor Diagnostic Service、S004 Telemetry Core Service |
| ADR | ADR-001、ADR-002、ADR-003、ADR-005 |
| Requirements | R001、R002、R003、R007、R008、R009、NFR001、NFR002、NFR003、NFR004、NFR005、NFR006 |
| Stories | US001、US002、US003、US006、US007、US008、US009 |

### 責務

U001 は、engine error directive と `aidlc-orchestrate.ts` top-level catch を `ERROR_LOGGED` として記録できるようにする。

U001 は、`.aidlc-hooks-health/*.drops` の hook drop 情報を `doctor` の標準表示と verbose detail へ接続できるようにする。

U001 は、OpenTelemetry core 計装の facade、no-op default、test exporter seam を作る。

U001 は、doctor output の section order と human-readable output contract を整える。

U001 は、stdout JSON 契約を持つ command に diagnostics を混ぜない。

### 境界

U001 は collector、dashboard、cloud export、always-on network export を扱わない。

U001 は subagent outcome の分類を完了させない。

U001 は conductor-independent warning と PR readiness aggregation を完了させない。

### 実装制約

OpenTelemetry は no-op default を維持する。

test exporter seam は deterministic test のために使う。

audit event 名は削除または改名しない。

`skills/` direct edits と `.coderabbit.yml` または `.coderabbit.yaml` の変更は対象外にする。

### 検証焦点

`ERROR_LOGGED` audit fixture、top-level catch fixture、stdout JSON parse、`.drops` fixture、malformed drops no-crash、OpenTelemetry no-op default no-send、test exporter assertion、typecheck を検証対象にする。

## U002-subagent-status-audit

### 目的

U002 は、subagent outcome を success、failure、unknown として audit と downstream analysis で区別できるようにする。

この Unit は、Issue #433 と audit taxonomy compatibility を扱う。

### 所有範囲

| Area | Included |
|---|---|
| Components | C001 Shared Contracts、C002 Error Audit、C005 Subagent Status |
| Method groups | Shared Contracts、Error Audit Methods、Subagent Status Methods |
| Logical services | S002 Evidence Recording Service |
| ADR | ADR-001、ADR-003 |
| Requirements | R004、R007、R008、R009、NFR004、NFR005 |
| Stories | US004、US006、US007、US008、US009 |

### 責務

U002 は、trustworthy status field がある hook input から success と failure を分類する。

U002 は、trustworthy status field がない hook input を free text から推測せず、unknown として扱う。

U002 は、`SUBAGENT_COMPLETED` の additive field を設計し、既存 row を読める互換性を保つ。

U002 は、subagent outcome の証拠を後続の Verification Traceability が read-only evidence として読める形にする。

### 境界

U002 は subagent の実行制御を扱わない。

U002 は Verification Traceability を呼び出さない。

U002 は conductor-independent warning を扱わない。

### 実装制約

既存 audit event 名を削除または改名しない。

新しい field は additive にする。

old audit row と new audit row の両方を deterministic fixture で扱う。

### 検証焦点

success fixture、failure fixture、missing status fixture、old/new audit row compatibility、typecheck を検証対象にする。

## U003-workflow-warning-traceability

### 目的

U003 は、conductor 自己申告に依存しない workflow warning と、PR readiness traceability を扱う。

この Unit は、Issue #435、Requirement-level evidence、parity boundary、PR readiness checklist を束ねる。

### 所有範囲

| Area | Included |
|---|---|
| Components | C001 Shared Contracts、C002 Error Audit、C005 Subagent Status、C006 Conductor Warning、C007 Verification Traceability、C008 Doctor Composition |
| Method groups | Shared Contracts、Conductor Warning Methods、Verification Traceability Methods、Doctor Composition Methods、read-only evidence access for Error Audit and Subagent Status |
| Logical services | S003 Doctor Diagnostic Service、S005 Verification Traceability Service |
| ADR | ADR-001、ADR-003、ADR-004、ADR-005 |
| Requirements | R005、R006、R007、R009、NFR004、NFR006 |
| Stories | US005、US006、US007、US009 |

### 責務

U003 は、run-stage/report mismatch、in-flight stage abandonment、runtime graph/audit contradiction を doctor warning として表面化する。

U003 は、doctor warning を non-mutating に保つ。

U003 は、R001-R009 と verification evidence の対応を Intent artifact または PR readiness checklist へ接続する。

U003 は、parity failure がある場合に failure reason と resolution path を trace に含める。

U003 は、collector、dashboard、cloud infrastructure、`skills/` direct edits、unauthorized `.coderabbit.yml` changes を out of scope として明示する。

### 境界

U003 は CI を実行しない。

U003 は merge 判断を所有しない。

U003 は workflow state を変更しない。

U003 は Error Audit と Subagent Status の evidence を read-only で参照する。

### 実装制約

doctor warning は hard error ではなく actionable warning として扱う。

`engineFileExceptions` は明示承認なしに変更しない。

PR readiness の証拠は Issue、Requirement、test result、validator、parity、stdout JSON、OpenTelemetry no-op default を含む。

### 検証焦点

state/audit contradiction fixture、non-mutating doctor assertion、Requirement evidence map、PR checklist inspection、parity result、validator result を検証対象にする。

## Unit 横断制約

| Constraint | Applies to |
|---|---|
| stdout JSON 契約を壊さない。 | U001、U002、U003 |
| OpenTelemetry は no-op default とする。 | U001 |
| audit event 名を削除または改名しない。 | U001、U002 |
| `skills/` direct edits をしない。 | U001、U002、U003 |
| `.coderabbit.yml` または `.coderabbit.yaml` を明示許可なしに変更しない。 | U001、U002、U003 |
| collector、dashboard、cloud infrastructure、always-on export を含めない。 | U001、U002、U003 |
| deterministic test または validator evidence を残す。 | U001、U002、U003 |

## Traceability

| Unit | Requirements | Stories | Issues or source |
|---|---|---|---|
| U001-failure-evidence-foundation | R001、R002、R003、R007、R008、R009、NFR001、NFR002、NFR003、NFR004、NFR005、NFR006 | US001、US002、US003、US006、US007、US008、US009 | #431、#432、OpenTelemetry core correction |
| U002-subagent-status-audit | R004、R007、R008、R009、NFR004、NFR005 | US004、US006、US007、US008、US009 | #433 |
| U003-workflow-warning-traceability | R005、R006、R007、R009、NFR004、NFR006 | US005、US006、US007、US009 | #435、#431、#432、#433 |

## Review

Verdict: READY
Reviewer: aidlc-architecture-reviewer-agent
Date: 2026-07-04T07:03:57Z
Iteration: 1

| Severity | Finding | Evidence | Required action |
|---|---|---|---|
| None | Unit ID と Unit 名は 3 成果物で一貫している。 | `unit-of-work.md` は `U001`、`U002`、`U003` と `failure-evidence-foundation`、`subagent-status-audit`、`workflow-warning-traceability` を定義している。`unit-of-work-dependency.md` と `unit-of-work-story-map.md` は同じ結合表記 `U001-failure-evidence-foundation`、`U002-subagent-status-audit`、`U003-workflow-warning-traceability` を使っている。 | None |
| None | `unit-of-work-dependency.md` の fenced `yaml` edge block は全 Unit を 1 回ずつ宣言し、direct dependency は有向非循環である。 | 機械確認では宣言 Unit は 3 件、重複なし、未宣言参照なし、自己依存なし、循環なしだった。依存は `U002 -> U001` と `U003 -> U001,U002` だけである。 | None |
| None | Stage 2.7 は実装順、critical path、価値順、risk-first、walking skeleton first を決めていない。 | `unit-of-work.md` と `unit-of-work-dependency.md` は、これらの判断を Stage 2.8 Delivery Planning に残すと明記している。`Parallel Development Opportunities` の記述は依存なし節点と blocked 条件の説明に限られている。 | None |
| None | 上流設計、要求、story の内容は Unit 境界と検証焦点へ反映されている。 | U001 は Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition と R001-R003 を扱う。U002 は Subagent Status と audit taxonomy compatibility と R004、R008 を扱う。U003 は Conductor Warning、Verification Traceability、PR readiness と R005-R007、R009 を扱う。 | None |
| None | OpenTelemetry は core 計装に限定され、collector、dashboard、cloud export は Unit に入っていない。 | U001 は no-op default、facade、test exporter seam を所有し、collector、dashboard、cloud export、always-on network export を扱わないと明記している。story map の Won't Have でも WH001-WH004 を全 Unit の範囲外としている。 | None |
| None | `skills/` 配布物境界と `.coderabbit.yml` / `.coderabbit.yaml` 非変更境界は守られている。 | Unit 横断制約は `skills/` direct edits と `.coderabbit.yml` または `.coderabbit.yaml` の無許可変更を全 Unit の対象外にしている。リポジトリ内に `.coderabbit.yml` または `.coderabbit.yaml` は存在しなかった。 | None |
| None | developer が後続の Delivery Planning と Construction に進めるだけの Unit 境界と検証焦点がある。 | 各 Unit は所有 component、method group、logical service、ADR、requirements、stories、責務、境界、実装制約、検証焦点を持つ。依存 DAG と story map は後続の Bolt sequencing と実装検証へ渡せる粒度である。 | None |

Summary:
- Units Generation の 3 成果物は、上流の `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`、`stories` を参照し、3 Unit の境界へ反映している。
- 依存関係は topology の説明に留まり、Stage 2.8 が担う経済的な sequencing 判断を先取りしていない。
- OpenTelemetry、`skills/`、`.coderabbit.yml` / `.coderabbit.yaml` の境界は明示されており、重大な指摘はない。
