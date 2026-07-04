# Security Requirements: U003-workflow-warning-traceability

## 上流文脈

この security-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、`aidlc-state.md`、audit、`runtime-graph.json`、stage artifacts、Requirement evidence map、PR readiness checklist の data flow を定義している。

`business-rules` は、doctor warning の state 非変更、missing evidence warning、`engineFileExceptions` 非変更、scope-out 境界を定義している。

`requirements` は、R005、R006、R007、R008、R009、NFR001、NFR005、NFR006 を定義している。

`technology-stack` は optional input であり、この Intent では個別成果物として存在しないため、既存の TypeScript と Bun の CLI 前提を上流技術制約として扱う。

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| workflow state fields | internal | read-only evidence として扱う |
| audit rows | internal | append-only evidence として扱い、U003 では書き換えない |
| `runtime-graph.json` | internal | compiled workflow evidence として読む |
| stage artifact paths | internal | path と existence を evidence にする |
| Requirement evidence map | internal | Requirement、Issue、verification ref の対応を残す |
| PR readiness checklist | internal | unresolved item と scope-out item を区別する |

U003 は authentication credential、token、secret、regulated personal data を分類対象にしない。

## STRIDE Requirements

| STRIDE | Requirement | Verification |
|---|---|---|
| Spoofing | conductor 自己申告を failure evidence の trusted source にしない。 | fixture review |
| Tampering | doctor warning は `aidlc-state.md`、audit、`runtime-graph.json` を変更しない。 | non-mutating assertion |
| Repudiation | run-stage/report mismatch、abandonment、contradiction の warning reason を evidence ref とともに残す。 | doctor warning fixture |
| Information Disclosure | doctor standard output と PR readiness checklist に secret、token、full stack trace を混ぜない。 | output inspection |
| Denial of Service | missing artifact と malformed evidence は warning にし、doctor を crash させない。 | malformed evidence fixture |
| Elevation of Privilege | `engineFileExceptions` と `.coderabbit.yml` または `.coderabbit.yaml` を変更しない。 | diff inspection |

## Access and Permission Requirements

U003 は新しい network service、database、cloud IAM permission を要求しない。

file-backed evidence は既存 workspace の file permission 境界に従う。

OpenTelemetry exporter は明示設定がある場合だけ有効にする。

default no-op では network export を試みない。

## Logging and Redaction Requirements

Doctor warning は label、reason、evidence ref、resolution path を含める。

standard output は concise summary に限定する。

verbose detail は調査用途に分ける。

stdout JSON contract を持つ command は、diagnostic text を stdout に出さない。

Requirement evidence map と PR readiness checklist は missing evidence を pass として表示しない。

## Compliance Requirements

この Unit は local workflow evidence と PR readiness evidence を扱う。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing はない。

SOC 2 相当の auditability と change traceability は、non-mutating doctor、append-only audit、deterministic verification、PR checklist で支える。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Security requirement は evidence の信頼境界と state mutation の禁止を分けている。

scope-out item を required item として扱わないため、collector や dashboard を暗黙要求にしていない。
