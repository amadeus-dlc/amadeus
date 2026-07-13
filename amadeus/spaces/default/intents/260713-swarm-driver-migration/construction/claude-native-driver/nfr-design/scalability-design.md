# Claude Native Driver Scalability Design

## 入力契約とscale model

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。scale dimensionはUnit数`n`、stream/hook event数`e`、provider-state row数`s`、固定2 mode view、prefix候補`k<=256`である。Claude service replica、remote scheduler、queueはU-03の所有外である。

## Native coordination topology

| Mode | Coordinator | Native child mapping | Evidence mapping |
|---|---:|---|---|
| Agent Teams | waveごとに`claude -p` 1件 | Unitごとにshared task 1件 + teammate 1件 | Unit-task-member全単射 + created/completed/idle |
| Ultra Code | waveごとに`claude -p` 1件 | Unitごとにworkflow task 1件 + worker agent 1件 | Unit-task-agent全単射 + start/stop |

C-05はC-01が決めたwave/Unit集合を変更せず、Unitごとのprovider process、planner/verifier余分agent、nested team、独自queue/pool、hidden concurrency limitを追加しない。native schedulerへparallelism値を注入せず、結果の全単射だけを検証する。

## Data organization and bounds

| Resource | Organization | Bound |
|---|---|---|
| mode adapter | immutable driver-keyed 2 view | Claude exactly 2 |
| common probe | fresh resolve-scope Promise | scopeごとに1 |
| manifest | Unit key stable sort | `O(n)` memory |
| provider-state | task/agent key index | `O(s)` memory |
| stream/hook | source/event identity index | `O(e)` memory |
| correlation | Unit/token/task/agent map | `O(n+e+s)` memory |
| session prefix | counter direct lookup |最大256、scan 0 |

normalizationは`O((n+e+s) log(n+e+s))`以下とし、missing/extra/duplicate child/eventをdrop、sample、partial success化しない。raw state/streamはprojection後に破棄し、cross-attempt cacheを0件にする。

## Concurrency and isolation

- 各waveはfresh session/run、evidence dir、capture identity、prefix reservationを持ち、別wave/attemptのstateを共有しない。
- hook writerはeventごとのexclusive-create fileで隔離し、共有JSONL lockを使わない。
- Agent Teams prefix reservationはuser-scoped lockで競合を直列化するが、team/task rootを列挙しない。
- capture/process schedulingとresource cleanupはU-02 supervisor、provider内部schedulingはClaude、Unit全単射判定はC-08が所有する。
- resumeはfresh resolve scope/session/pathを使い、旧probe/team/task/run/snapshotを再利用しない。

## Growth and degradation policy

driver追加、surface profile version追加、Unit上限変更、複数coordinator process、Linux credentialed live proof必須化は別Intentでclosed schema、registration cardinality、release matrixを更新する。permissive parser、dynamic plugin、unknown version catch-allを追加しない。

prefix枯渇、capture backlog/stop failure、unknown profile/schema、extra/missing childはnative successにしない。dispatch前の`auto`だけが固定候補へ進める。dispatch後は別mode/floorへfallbackせず`failed-resumable`とする。

## Scalability verification

- generated Unit/event/state size ladderでoperation/object countと全単射を検証する。
- process traceでwaveごとのClaude coordinator exactly 1、Unitごとのprovider process 0を確認する。
- C-01 planとC-05 manifest/launchのUnit/wave equalityを検証する。
- 256 collision fixtureでroot listing/delete/adoption 0、candidate 257評価0を確認する。
- parallel wave/attempt fixtureでsession/evidence/hook cross-talk、global cache、shared mutable adapter stateを0件にする。
