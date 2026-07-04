# Security Design: U003-workflow-warning-traceability

## 上流文脈

この security-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、snapshot と fixed-set aggregation による bounded design を定義している。

`security-requirements` は、workflow state fields、audit rows、`runtime-graph.json`、stage artifact paths、Requirement evidence map、PR readiness checklist の分類を定義している。

`scalability-requirements` は、U001 と U002 evidence を read-only に読む境界を定義している。

`reliability-requirements` は、doctor warning の非破壊性と missing evidence warning を定義している。

`tech-stack-decisions` は、doctor warning を hard error にせず、existing audit event names を維持する判断を定義している。

`business-logic-model` は、Conductor Warning、Verification Traceability、Doctor Composition の data flow を定義している。

## Trust Boundary

| Boundary | Design |
|---|---|
| `aidlc-state.md` | read-only evidence として読む。 |
| audit rows | append-only evidence として読み、U003 では書き換えない。 |
| `runtime-graph.json` | compiled workflow evidence として読む。 |
| stage artifacts | path と existence を evidence として扱う。 |
| Requirement evidence map | Requirement、Issue、verification ref の対応だけを持つ。 |
| PR readiness checklist | unresolved item と scope-out item を分ける。 |

## Security Controls

Conductor 自己申告を failure evidence の trusted source にしない。

Doctor warning は state、audit、`runtime-graph.json` を変更しない。

Warning reason は evidence ref と resolution path を持つ。

Doctor standard output と PR readiness checklist に secret、token、full stack trace を混ぜない。

Missing artifact と malformed evidence は warning にし、doctor を crash させない。

`engineFileExceptions` と `.coderabbit.yml` または `.coderabbit.yaml` は変更しない。

## PR Readiness Boundary

Required item は Issue、Intent、Requirement、test result、validator、parity、stdout JSON、OpenTelemetry no-op default に限定する。

Collector、dashboard、cloud infrastructure、direct `skills/` edits は scope-out item として扱う。

Missing evidence は pass ではなく warning item にする。

Parity failure がある場合は reason と resolution path を含める。

## Compliance Design

U003 は local workflow evidence と PR readiness evidence を扱う。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing は追加しない。

SOC 2 相当の auditability と change traceability は、non-mutating doctor、append-only audit、deterministic verification、PR checklist で支える。

新しい network service、database、cloud IAM permission は要求しない。

## Verification Design

fixture review で conductor 自己申告に依存しないことを確認する。

non-mutating assertion で state、audit、`runtime-graph.json` を変更しないことを確認する。

doctor warning fixture で reason と evidence ref を確認する。

output inspection で secret、token、full stack trace が混ざらないことを確認する。

diff inspection で `engineFileExceptions` と `.coderabbit.yml` または `.coderabbit.yaml` が変更されていないことを確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Security design は evidence の信頼境界と state mutation の禁止を分けている。

scope-out item を required item として扱わないため、collector や dashboard を暗黙要求にしていない。
