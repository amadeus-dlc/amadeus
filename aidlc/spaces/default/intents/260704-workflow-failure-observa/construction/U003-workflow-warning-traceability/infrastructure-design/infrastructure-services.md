# Infrastructure Services: U003-workflow-warning-traceability

## 上流文脈

この infrastructure-services は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、snapshot 構築、warning evaluation、Requirement evidence map、PR readiness checklist を定義している。

`security-design` は、state、audit、`runtime-graph.json`、stage artifact paths、Requirement evidence map、PR checklist の trust boundary を定義している。

`scalability-design` は、U001 と U002 evidence を read-only adapter で読む方針を定義している。

`reliability-design` は、malformed audit row、missing stage artifact、missing `runtime-graph.json`、parity failure の containment を定義している。

`logical-components` は、Workflow Evidence Snapshot、Conductor Warning Evaluator、Requirement Evidence Mapper、PR Readiness Checklist Builder を定義している。

`components` は、Conductor Warning、Verification Traceability、Doctor Composition の責務を定義している。

`services` は、Doctor Diagnostic Service と Verification Traceability Service の通信境界を定義している。

`business-logic-model` は、U001 と U002 の evidence refs を RequirementEvidenceItem に変換する流れを定義している。

## Service Selection

U003 は database、cache、message queue、search service、CDN、DNS、load balancer を新設しない。

必要な service surface は、workflow evidence snapshot、warning evaluator、traceability mapper、PR checklist builder である。

| Service surface | 役割 | 所有 component | Infrastructure decision |
|---|---|---|---|
| `aidlc-state.md` reader | stage status と current stage を読む。 | Workflow Evidence Snapshot | read-only に限定する。 |
| audit reader | transition、sensor、error、subagent evidence を読む。 | Workflow Evidence Snapshot | append-only evidence を読む。 |
| `runtime-graph.json` reader | compiled workflow evidence を読む。 | Conductor Warning Evaluator | missing は warning にする。 |
| Requirement evidence map | R001-R009 と evidence item を対応付ける。 | Requirement Evidence Mapper | fixed rows にする。 |
| PR checklist | Issue、Intent、test result、validator、parity、scope-out を集約する。 | PR Readiness Checklist Builder | CI 実行はしない。 |

## Database and Cache

U003 は database を追加しない。

Audit、state、実行時 graph、stage artifacts は既存 file-backed surface として読む。

Cache layer は追加しない。

同じ audit を warning type ごとに重複 scan しないため、snapshot を先に作る。

## Messaging and Service Discovery

U003 は message broker を追加しない。

Doctor Diagnostic Service と Verification Traceability Service は in-process helper call で連携する。

Service discovery は不要である。

U001 と U002 の evidence は audit row と artifact path を read-only に読む。

## External Integrations

U003 は external collector、dashboard、cloud telemetry export を必須にしない。

CI 結果は外部 evidence として checklist へ取り込むだけで、CI を実行しない。

GitHub Issue と PR は reference として扱い、U003 が外部 API を必須にしない。

## Security Controls

Doctor warning は state、audit、`runtime-graph.json` を変更しない。

False-positive guard は pending question と approval gate evidence を先に見る。

Missing evidence は pass ではなく warning item にする。

Scope-out item は required item に昇格しない。

`skills/` direct edits と unauthorized `.coderabbit.yml` changes は scope-out として扱う。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

U003 の infrastructure services は、read-only evidence surface と in-process helper に限定されている。

CI 実行や cloud dashboard を持たないため、traceability の境界が明確である。
