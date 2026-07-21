# Domain Entities — eligibility-report

## 上流境界

本モデルは`unit-of-work.md` のU8境界、`unit-of-work-story-map.md` のS-3/S-7/S-8、`requirements.md` のhard eligibility / Pareto / Alloy / report、`components.md` のEvaluator / Renderer、`component-methods.md` のevaluate / report methods、`services.md` のnon-interactive CLIを入力とする。raw evidence、matrix、cost、arm oracleをentityへ重複させない。

U3/U4/U5はmax-exhausted後是正の第三review未実施、U7はREADY判定に残存Major 2件がある。`FinalCompositionStatus`は最終FD人間裁定まで`DESIGNED_BLOCKED_ON_FINAL_FD_GATE`だけを許す。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `EligibilityReason` | `DEFECT_NOT_DETECTED / HARNESS_ERROR / BASELINE_FALSE_POSITIVE` | U8 |
| `CostTuple` | `(ArmAuthoredLoc, AuthoringElapsedMs, SuiteMedianMs)`、全値non-negative | U8 |
| `FinalDecision` | `ARM_T_CANDIDATE / ARM_S_CANDIDATE / BOTH_ELIGIBLE_NO_WINNER / BOTH_INELIGIBLE` | U8 |
| `AlloyTriggerState` | `NOT_TRIGGERED / SEPARATE_DECISION_REQUIRED` | U8 |
| `EvaluationIdentity` | source identities + algorithm version + resultのSHA-256 | U8 |
| `ReportIdentity` | canonical report modelのSHA-256 | U8 |

## Evaluation entities

`StructurallyVerifiedEvidence`は`FullMatrixEvidenceId`、input set / schedule、D-COUNT、T/S freeze、baseline、promoted manifest、command / CI / artifact refs、expected cellのbijectionを束ねる。`CompleteMatrix`またはfindingsがverified expected `HARNESS_ERROR_CELL`だけの`StructurallyCompleteHarnessMatrix`から構築し、missing / timeout / duplicate / corruption / drift / disagreementを拒否する。

`ArmEligibility`は`Eligible { arm } | Ineligible { arm, nonEmptyReasons }`のclosed unionである。構造不全はこのunionを作らず`EvaluationFailure`にする。`EligiblePairCosts`は両armがeligibleになった後だけLOC / elapsed / complete timing aggregatesを検証してmintし、各armの`CostTuple`を持つ。

`ParetoRelation`は`T_DOMINATES / S_DOMINATES / NON_DOMINATED_PAIR`である。両armeligibleの場合だけ存在し、完全同値は`NON_DOMINATED_PAIR`に含める。

`DecisionResult`は`ValidDecision { eligibilityByArm, eligiblePairCosts?, pareto?, finalDecision, identity } | EvaluationFailure { code, findings, sourceRefs }`である。costは両armeligible variantだけで必須である。`EvaluationFailure`は`FinalDecision`ではなく、失敗を`BOTH_INELIGIBLE`へ丸めない。

## Alloy entities

`MissedContract`はdefect alias、contract class、arm、cell / bundle refsを持つ。`AlloyAssessment`は全misses、両arm共通contract classes、trigger state、別裁定要否を持つ。Alloy implementation / resultを格納するfieldは持たない。

## Report entities

`ReversalConditionRef`は6体グリリング正本identity、condition ordinal、verbatim text hashを持つ。`ReversalConditionMapping`は正本条件1件と非空の`SUPPORTS / REFUTES` cell refsを結ぶ。正本conditionsとmapping keysのbijectionをconstructorで検証する。

`ReportModel`はdefect registry、branch / commit map、freeze provenance、input / schedule、cell matrix、baseline rows、raw / aggregate costs、decision result、Alloy assessment、全`ReversalConditionMapping`、trace indexをimmutableに結ぶ。

`TraceIndexEntry`は`reportRowId`、semantic key、command receipt、CI run / job、artifact / bundle ref、content hashを持つ。`TraceVerificationResult`は`VerifiedTraceIndex | InvalidTraceIndex`のclosed unionで、missing / duplicate / hash drift / semantic drift findingsを全数保持する。

`RenderedReport`はverified `ReportModel` identity、canonical JSON bytes、Markdown bytes、renderer versionを持つ。rendererはdecision fieldを入力からcopyし、再計算用portを持たない。

## Wiring entities

`HandlerBinding`はclosed command discriminator、directly imported handler identity、runtime adapter、error contractを結ぶ。`FinalCliComposition`はU1 dispatcher portsと、`authoring-start` / `freeze`を所有するU1 Coordinator / provenance、Registry / Evidence / TLA / skeleton / TS / matrix / evaluate / report bindingsのbijectionであり、unknown fallbackを持たない。

`WiringVerification`はclosed command setとbinding setのexact equality、handler identity一意性、error / exit propagationを証明する。評価式、Pareto比較、report templateをcomposition entityへ格納しない。

## Ports and errors

| Port / operation | Input → Output | Failure |
| --- | --- | --- |
| `EvaluationInput.verifyStructure` | matrix / provenance / refs → structurally verified evidence | missing、timeout、duplicate、identity、trace |
| `Eligibility.classify` | structurally verified evidence / arm → arm eligibility | closed reason set |
| `EligiblePairCosts.verify` | two eligible arms / raw costs → pair costs | missing、identity、incomplete timing |
| `Pareto.compare` | eligible pair costs → relation | invalid tuple |
| `Decision.close` | two eligibility + optional relation → final decision | inconsistent relation |
| `Alloy.assess` | valid matrix / registry → trigger assessment | trace / class mapping |
| `ReversalMapping.verify` | grilling source / mappings / cells → verified mappings | source drift、missing、empty、invented |
| `ReportModel.build` | sources / decision / Alloy / reversal mappings / trace index → model | missing section / row |
| `TraceVerifier.verify` | report model / source store → trace result | missing、duplicate、hash / semantic drift |
| `ReportRenderer.render` | verified model → JSON / Markdown | encoding / identity |
| `FinalCliRoot.compose` | dispatcher ports / direct handlers → composition | missing、duplicate、unknown command |

errorsは`EvaluationInputError / EligibilityError / ParetoError / DecisionError / AlloyAssessmentError / ReportModelError / TraceVerificationError / RenderError / WiringError`のclosed unionでsource identityとcauseを保持する。U3/U4/U5/U7 unresolved statusはdomain failureへ丸めず外部gateとして保持する。
