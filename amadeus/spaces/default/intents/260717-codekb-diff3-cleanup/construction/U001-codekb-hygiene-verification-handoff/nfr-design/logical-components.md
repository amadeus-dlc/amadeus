# Logical Components — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component Boundary

以下は`business-logic-model.md` のworkflowと、`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md` のNFR patternを結び付ける非deployableな責務境界である。Application class、service、process、AWS resource、IaC stackを追加しない。

## Inventory

| ID | Logical component | Responsibility | Input | Output | Failure isolation |
|---|---|---|---|---|---|
| LC-1 | Measurement Resolver | explicit refをfull SHAへ固定 | ref | `MeasurementRef` | resolve failureで当該set停止 |
| LC-2 | Content Scanner | 2 pathのmarker / H2全数計数 | LC-1、Git blobs | 12 counts + matches | content mismatchでlanding前停止 |
| LC-3 | Ancestry Verifier | fix SHAとのgraph関係を独立検査 | LC-1、fix SHA | `AncestryEvidence` | content verdictへ影響させない |
| LC-4 | Evidence Candidate Builder | same-SHA fieldとpre-gate admissibilityを統合 | LC-1〜3、CI / review / sensor / §13 / push | `PreGateEvidenceCandidate` / stop | incomplete evidenceを封じる |
| LC-5 | Approval Boundary | human / grant authorityを検証しfinal evidenceを構築 | LC-4 candidate、gate input | `PreLandingEvidence` / hold | gate前後を分離しexternal operationを隔離 |
| LC-6 | Post-Landing Verifier | landed mainを新MeasurementAttemptで再計測 | attempt ID / observedAt / explicit landed ref | `LandedMainEvidence` / stop | branch resultと同値再観測を区別 |
| LC-7 | Close Handoff | Issue OPENとpost-landing greenを照合 | LC-6、Issue observation | close eligibility / ordering violation | Issue operationをhumanへ隔離 |

## Dependency Flow

```text
LC-1 -> LC-2 -----+
  |               |
  +----> LC-3 ----+--> LC-4 --> LC-5 --> human landing --> LC-6 --> LC-7
```

Text fallback: ResolverがScannerとAncestry Verifierへ同じSHAを渡し、Evidence Candidate Builderが双方とgate以外のlifecycle evidenceを統合する。Approval Boundaryがauthorityを検証してcandidateとgateをfinal `PreLandingEvidence`へ結合するため循環はない。それより先のlandingはhuman所有で、Post-Landing Verifierはattempt ID / observedAt / landed refから新しい測定を作り、Close HandoffだけがIssue eligibilityを評価する。

## Shared Resources and Isolation

| Resource | Shared by | Isolation rule |
|---|---|---|
| Git object database | LC-1 / 2 / 3 / 6 | read-only、refをfull SHAへ固定 |
| Intent record | LC-4 / 5 / 7 | version-controlled、field provenanceを保持 |
| Tool-owned audit | LC-4 / 5 | state toolだけがtransitionを追記 |
| Remote branch | checkpoint / handoff | exact commit push、force pushなし |

Shared mutable cache、database、queue、credential store、AWS account resourceは存在しない。

## Blast Radius Map

- LC-1 failure: 1 measurement set。content scanを開始しない。
- LC-2 failure: content clean claimとlanding handoffまで。Ancestry evidenceは独立保持できるがgate-readyにしない。
- LC-3 failure: pre-landing admissibilityまで。Content tupleは保持してもapproveしない。
- LC-4 failure: pre-gate candidate生成まで。Target Markdownを自動変更しない。
- LC-5 failure: final evidence / workflow transitionまで。main / Issueへ副作用を出さない。
- LC-6 failure: post-landing verificationだけ。PreLandingEvidenceを改変しない。
- LC-7 failure: Issue close eligibilityだけ。Engine lifecycle doneを巻き戻さない。

## Infrastructure Bridge

Infrastructure Designへ渡すAWS / deployable componentは0件である。Logical componentsは既存tool / artifact / actor boundaryへの割当で完結し、environment、region、IAM、network、compute、storage、monitoring costを新設しない。

## Review

**Verdict:** READY

**Reviewer:** amadeus-architect-agent

**Date:** 2026-07-17T20:48:51Z

**Iteration:** 2

### Findings

| # | Severity | Status | Finding / Resolution |
|---|---|---|---|
| 1 | Major | RESOLVED | LC-4をgate非含有`PreGateEvidenceCandidate`、LC-5をauthority検証後のfinal `PreLandingEvidence`生成へ分離し、循環を除去した。 |
| 2 | Minor | RESOLVED | `MeasurementAttempt(attemptId, observedAt, MeasurementRef)`で同一ref / SHAの再観測identityを定義した。 |
| 3 | Minor | RESOLVED | Q&AにLC-7 Close Handoffを追加し、inventoryの7 componentと一致させた。 |

### Validation Tool Results

- 必須5成果物とQ&Aが実在し、各H2見出しは3件以上。
- 全6ファイルでconsumes 6/6を参照。
- `PreGateEvidenceCandidate → authority検証 → PreLandingEvidence`の非循環順序を確認。
- LC-1〜LC-7の定義とQ&A列挙が一致。
- Code snippet / bare PR言及0、`git diff --check` PASS、新規finding 0。
