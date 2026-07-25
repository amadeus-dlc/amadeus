# Scalability Requirements: solo-gate-transaction

## Inputs and Growth Model

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`に基づく。scale dimensionはconcurrent route/report数、intent数、per-unit数であり、audit event容量はU1のtargetを継承する。

## Capacity Targets

| ID | Dimension | Required capacity | Behavior |
|---|---:|---:|---|
| U2-SCALE-01 | concurrent route sessions | 32 | UUID v4 Route Idが一意、receipt exactly 1 |
| U2-SCALE-02 | intents | 100 | active cursorによらずreceipt ownerだけをtarget |
| U2-SCALE-03 | per-unit count | 10 | all-covered final gateだけcarrier候補 |
| U2-SCALE-04 | concurrent report attempts | 32 | deadlockなし、既存lock retry budget内で全processがsuccess/fallback/fatalのいずれかへ終端 |

## Concurrency Strategy

route receipt appendとgrant-backed commitだけが既存workspace-level outer lockを共有し、owner intent lockを取る場合は必ずworkspace → owner intentの順とする。carrierなしhuman/team pathはworkspace outer lockを新たに取得しない。fallback後のtargeted human pathはsession reservationのopaque UUIDをregistry解決した既存intent lockだけを取得する。異なるRoute Idはreceiptとして共存できるが、同じstageのapproval mutationは既存state machineが重複完了を防ぐ。

32-session barrier fixtureはsleepではなくlock acquisition hookで順序を制御する。timeoutは既存lock retry budgetをそのまま使用し、本Issue固有の無限retryやqueueを追加しない。

presence reservationはhost session IDごとに分離し、32 sessionが異なるownerへfallbackしても相互のmarker/HUMAN_TURNをconsumeしない。同一sessionに未消費reservationを重ねる場合はlatest推論をせず、2件目をfail-closedにする。

## Scaling Limits

100 intent・100,000 eventsを超える最適化は本Issueの対象外である。新しいindexやdistributed lockを導入せず、超過時は別intentで観測値に基づき検討する。

## Traceability and Ownership

| Target | Upstream | Transaction rules | Blocking suite |
|---|---|---|---|
| U2-SCALE-01 | FR-08, NFR-01–02 | TR-04–05 | route contention integration |
| U2-SCALE-02 | FR-02, FR-12–17 | TR-22–23 | cross-intent integration |
| U2-SCALE-03 | FR-22–23 | TR-06–07 | per-unit integration |
| U2-SCALE-04 | NFR-01–02, NFR-04 | TR-15–23 | lock-contention integration |
