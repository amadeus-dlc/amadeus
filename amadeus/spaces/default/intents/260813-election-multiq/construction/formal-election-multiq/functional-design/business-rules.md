# Business Rules — formal-election-multiq

## Sources and abstraction

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) のU7を有限状態へ抽象化する。

## State and transitions

Constants: finite `Voters`, `Questions`, question-owned `Choices`, `Goas`。Variables: `accepted[voter][question]`、`results[question]` (`none|hold|established`) 、`targets`、`preserved`、global phase。

Transitions:

1. Open: all questions target、results none。
2. AcceptResponse(v,q,c,g): q∈targets、v/q未受付、c∈Choices[q]。
3. TallyQuestion(q): q∈targets、当該question responsesだけからhold/established。
4. FinishRun: target resultsをmergeし、holdありpartial、なければtallied。
5. Rerun: targetsをheld question集合exactに設定、establishedをpreservedへ固定。

## Invariants

- I1 QuestionIdsUnique。
- I2 AcceptedDomain: accepted key/valueはdeclared voter/question/choice/GoA内。
- I3 ResultCompleteness: run完了時に全question exactly one result。
- I4 PerQuestionIsolation: result[q]はq responsesだけに依存。
- I5 EstablishedImmutable: 一度establishedのq resultは後続stateで不変。
- I6 HeldOnlyTargets: rerun targets = current held IDs、preservedとの交差なし。
- I7 MixedLifecycle: holdありiff partial、all established iff tallied。
- I8 ResponseCoverage: tally対象questionは必要voter coverage policyを満たす。

Safety violationをTLCがcounterexampleとして検出する。livenessは「enabled transitionを公平に実行すればrunが完了」を限定的に検査し、外部humanが必ず投票することは仮定しない。

## Finite configuration

最小でも2 questions、2 voters、各2 choices、hold/establishedの双方が到達可能なGoA subsetを使う。symmetry setを使えるidentityに適用し、question IDの区別を消すsymmetryは使わない。state-space上限とTLC statsをreceiptに残す。

## Identity contract

FormalElection.tla/cfgとmodel-mapのmodule/cfg/aux/implementation identitiesをcanonical helperで再計算する。specだけ更新してimplementation identityを残す状態をcompleteness gateで拒否する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T12:04:20Z
- **Iteration:** 1
- **Scope decision:** none

### Findings

- None. TypeScriptのquestion identity、partition、preservation、lifecycleと対応するfinite state/invariantが明示されている。

### Summary

単問modelの配列化ではなく、rerun transitionとestablished不変性を第一級にモデル化するためFR-FML-1を反証可能にする。
