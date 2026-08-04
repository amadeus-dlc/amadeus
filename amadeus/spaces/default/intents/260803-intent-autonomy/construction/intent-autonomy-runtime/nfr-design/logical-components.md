# Logical Components — intent-autonomy-runtime

## 入力と境界

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

Intent AutonomyはAI-DLC内のinteraction authorizationであり、host permission、PR merge、外部runner、常駐supervisor、completed review UI、terminal live verificationを所有しない。

## Component inventory

| Component | Owns | Isolation |
| --- | --- | --- |
| `IntentGrantCore` (M04) | mode / grant projection、scope / policy normalization、candidate authorize / revalidate | human provenanceとIntent auditだけをauthorityにする |
| `AutoDecisionCore` (M05) | policy → norm/history → election → recommendation chain、decision record | option集合外回答と禁止effectを生成しない |
| `InteractionOccurrenceFactory` (M06) | gate / question / stage / phase / Bolt occurrence identity | 文面・時刻をidentityから除外 |
| `EffectAuthorizationValidator` (M06) | registry exact lookup、permission / scope / norm / waiver検証 | decision selectionとeffect authorizationを分離 |
| `AutonomyCoordinator` (M06) | mode table、reservation / commit、atomic ParkTransitionPlan / resume、failure result | caller booleanを受けずCore planを接続 |
| `AutonomyAuditProjection` (M07) | mode / grant / decision / exercise / park envelope / failure replay | per-Intent canonical truth、partial suspended stateを拒否、legacy diagnostic |
| `DecisionCapabilityAdapter` | election / recommendation capability factsとinvocation | capability欠落を偽投票へ変換しない |
| `AutonomyHarnessVerifier` (M08/M09) | 5harness contract fixture、live capability=false | harness固有authorization algorithmを禁止 |

## Dependency direction

`AuditProjection → IntentGrantCore / AutoDecisionCore → EffectAuthorizationValidator → Coordinator → Audit transaction`の方向に限定する。AutoDecisionCoreはeffectを実行せずoptionとbasisを返す。Effect validatorはdecision sourceを変更しない。M07だけがmode、grant、effect、park stateをcommitする。

park開始ではCoordinatorがreason、closed resume condition、nullable latch、expected revisionを1つのplanに閉じる。AuditProjectionは`WORKFLOW_PARKED`、optional latch、suspended stateを同一transactionからのみ可視化し、reason / condition / latchの部分状態をpublic resultへ出さない。

## Blast radius

- mode / grant tamper: 対象Intentをnone / human routeへ閉じ、別Intentを変更しない。
- norm conflict: 対象occurrenceをparkし、active grantを保持する。
- prohibited effect: candidateを作らずhuman routeへ送り、decision chainをpermissionへ転用しない。
- legacy standing grant: diagnosticだけを表示し、authorization projectionを変えない。
- harness capability欠落: recommendationへloud degradationし、fake electionを生成しない。

## Test seams

human-turn verifier、scope / policy normalizer、norm / history store、election / recommendation adapter、effect registry、audit transaction、clock / hash、harness registryをport化する。mode table、tamper、crash、clone merge、child Intent isolationをclosed fixtureで検証する。
