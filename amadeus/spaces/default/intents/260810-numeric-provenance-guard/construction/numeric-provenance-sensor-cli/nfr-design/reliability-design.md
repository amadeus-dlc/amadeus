# Reliability Design — numeric-provenance-sensor-cli

唯一のpresent consume `business-logic-model.md` のordered evaluation (`business-logic-model.md:5-20`)、verdict state machine (`business-logic-model.md:88-99`)、CLI failure boundary (`business-logic-model.md:101-111`) を信頼性設計の正本とする。NFR Requirements成果物はabsent-and-expectedであり、REL-* IDは作らない。

## Failure taxonomy

### Typed business verdict

次はprocess正常終了・JSON verdictで表す。

| Condition | Result |
| --- | --- |
| file missing / ENOENT | pass=true、skipped=true、file-not-found |
| pre-cutoff | pass=true、skipped=true、pre-cutoff |
| intents外/undatable/excluded | pass=true、skipped=true、typed reason |
| mapping lookupなし | pass=true、skipped=true、unmapped-artifact |
| measurement-only未併記 | pass=true、skipped=false、findings空、metrics |
| enforcement未併記 | pass=false、skipped=false、claimごとfinding |

通常FAILED verdictもexit code 0で返し、dispatcherがaudit eventへ変換できるようにする。

### Startup failure

次だけを`fail`とnonzero exitへ写す。

- 必須flag不足/重複などCLI invocation invalid。
- Generated Mappingのschema/digest/lookup conflict。
- ENOENT以外の読込不能でEvaluator inputを構築できない。
- JSON serialization/output自体の不能。

startup failureをskippedへ変換せず、business findingをstartup exceptionにしない。

## Deterministic completion

1 invocationはexactly 1 JSON verdictまたは1 startup failureで終わる。partial JSON、複数verdict、silent returnを許さない。findingはpath、line、column、class順、metrics keyは固定順でserializeする。

module-level Mappingはreadonlyで、process中にreloadしない。同じinput/deps/module revisionは同じverdict dataを返す。

## Retry and fallback policy

新規tool内でretryを行わない。

- missing/ENOENTはretryせずskipped。
- invalid linkはretryせずprovenance不成立。
- mapping破損はfallbackせずstartup failure。
- read permission/errorはretryせずstartup failure。

remote dependencyがないためcircuit breaker、exponential backoff、health endpoint、failover、replicationは非該当である。dispatcherがprocessを再実行するpolicyは本Unitの外部責務である。

## Graceful degradation

fail-openはadvisory signalの偽赤を避ける方向に限定する。判定不能path、cutoff前、対象外、missingはtyped reason付きskippedとして観測可能に保つ。mapping破損やflag不足までfail-openすると全検査が無効化されるため許可しない。

## Fault isolation

1成果物=1processなので、特定Markdownのstartup failureは他成果物のin-memory stateを破壊しない。新規shared cache、lock、temporary databaseを持たず、blast radiusを当該invocationに限定する。audit persistenceは既存dispatcher所有である。

## Verification matrix

| Fault injection | Expected result |
| --- | --- |
| nonexistent output path | file-not-found skipped、exit 0 |
| ENOENT race | missingへ変換、exit 0 |
| EACCES/read error | startup failure、nonzero |
| output pathのpre/open/post object不一致 | descriptor readなし、path-race skipped、exit 0 |
| invalid mapping digest | startup failure、fallbackなし |
| claim without provenance | normal FAILED verdict、exit 0 |
| measurement-only missing provenance | PASS + metrics |
| serializer invoked | exactly one valid JSON object |

## Recovery

business verdictは入力/Mapping修正後に再実行する。startup failureはflag、permission、generated projectionを修復し、同じinvocationを再実行する。process-local partial stateは終了時に破棄されるためcleanup protocolやrestore procedureは不要である。
