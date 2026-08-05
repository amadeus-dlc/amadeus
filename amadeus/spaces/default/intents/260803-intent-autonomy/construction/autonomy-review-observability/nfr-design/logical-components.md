# Logical Components — autonomy-review-observability

## 入力と境界

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

U4はdecision review / observability projectionを所有する。Intent reopen、rollback、過去event変更、新Intent作成、PR、runner、terminal live completionを所有しない。

## Component inventory

| Component | Owns | Isolation |
| --- | --- | --- |
| `DecisionReadModel` (M05/M07) | list / detail、queue eligibility、snapshot-bound cursor、review projection | explicit Intent partitionだけを読み、page間driftを拒否 |
| `SafeDecisionProjector` | question / option / subject / evidence redaction | raw fallback禁止、withheldをclosed表現 |
| `HumanReviewAuthorizer` (M07) | active source canonical read、human turn / binding / receipt検証 | caller payloadをauthorityにしない |
| `DecisionReviewCoordinator` (M06) | accept / flag command、classification、remediation suggestion | suggestionを実行しない |
| `ProtectedReviewAppender` (M07) | active review atomic append、idempotent receipt | decision / effectを変更しない |
| `CompletedReviewValidator` (M07) | seal / head CAS、review-only extension chain | general post-seal mutationへ再利用不可 |
| `ReviewStatusProjector` (M07) | human / machine status from one validated input | formatterごとの再読を禁止 |
| `ReviewTelemetryProjector` | Event Registry / OTel safe attributes | shared redaction後metadataだけ |
| `ReviewHarnessVerifier` (M09) | 5harness canonical vectors、behavior / reload fixture | native adapterへeligibilityを複製しない |

## Dependency direction

`Canonical audit → ReadModel / Authorizer → Coordinator → protected appender → Review projection / Status / Telemetry`の方向に限定する。M05はM07を直接importせずreader / registry portを使う。Coordinatorはseal bypassやraw audit append APIを持たない。

ReadModel adapterはaudit revision、extension head、event-set digestを同じread snapshotから返す。M05はそのopaque snapshot identityをcursorへ束縛し、次pageのM07再読がdriftを検出した場合はitemsを返さず`CONFLICT(cursorSnapshot)`を伝播する。

## Blast radius

- source authorization不備: target reviewを変更しない。
- redaction失敗: 対象fieldをwithheldにし、raw payloadを公開しない。
- completed extension conflict: target completionは維持し、review appendだけを拒否する。
- flag: remediation suggestionだけを返し、現Intent / grant / artifactを変更しない。
- harness mismatch: suiteをfailにするがCore review stateを変更しない。

## Test seams

source / target audit reader、human-turn verifier、redactor、actor registry、active appender、completed validator、canonical encoder、status / telemetry sink、persistence reload、harness adapterをport化する。active / completed、tamper、crash、clone、redactionをclosed fixtureで検証する。
