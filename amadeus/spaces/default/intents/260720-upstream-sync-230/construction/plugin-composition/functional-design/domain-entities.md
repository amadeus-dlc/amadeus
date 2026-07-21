# Domain Entities — plugin-composition

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
PluginDescriptor + HostSnapshot -> PluginPlanResult
ValidPlugin + HostSnapshot -> PluginCompositionPlan -> WorkspaceTransaction -> ApplyResult
PluginRecord + HostSnapshot -> PluginDropPlan -> WorkspaceTransaction -> DropResult
HostSnapshot -> PluginDiagnostic[]
```

これらはC4のinvocation-local value/transactionである。database aggregateやremote plugin registryではない。

## PluginPlanResult

```ts
type PluginPlanResult =
  | { kind: "ready"; plan: PluginCompositionPlan }
  | { kind: "rejected"; errors: readonly PluginError[] };
```

`PluginDescriptor`と`HostSnapshot`のinspection結果を閉じる正準unionである。errorが一件でもあればrejectedとなり、ready planと同時には存在しない。`PluginError[]`はsame-name、malformed、unknown seam、clobberの全検出結果を運ぶ。

## Composition plan and transaction

`PluginCompositionPlan`は検証済み`ValidPlugin`と一つの`HostSnapshot`から導出され、no-clobber copy、4宣言seam merge、宣言fragment spliceの変更意図を表す。具体fieldは既存型を正本とし、新しいpublic signatureを追加しない。

`WorkspaceTransaction`はtemp host treeへのstage、C1/C2 compile、sensor、atomic commitの境界である。失敗時にcanonical host、composition record、auditへ戻るrollback処理ではなく、commit前のtemp結果を破棄して不変性を守る。

## PluginRecord and drop plan

`PluginRecord`は成功composeが所有したnew pathに加え、shared fileごとのbase/precondition、plugin自身のcanonical contribution、決定的適用順、期待post-stateを正準記録する。shared file全体のownershipは保持しない。`PluginDropPlan`はrecordとcurrent `HostSnapshot`から導出し、record外pathやuser-authored ownershipを推測追加しない。

drop前に全shared fileのcurrentが期待post-stateへ一致することを検証し、対象plugin contributionを除いたbase+残存寄与をrecord順で再構築する。不一致は三面不変でrejectする。

## Durable transaction journal

journalはworkspace lock下のdurable write-ahead entityで、transaction id、`PREPARED | COMMITTED` phase、host/record/audit三面の全write-setとpreimageを保持する。最初のcanonical mutationより前にPREPAREDをdurable化し、三面write完了後だけCOMMITTEDにする。

handled failureでは同じtransactionが全preimageを即時復元する。process crash後は次のcompose/drop開始前にlock下で未完了journalを検出し、pre-stateへ冪等回復する。未回復中は新規操作を受理しない。current/preimage driftまたはjournal corruption時は追加mutationせずloud停止する。

`ApplyResult`と`DropResult`の具体variantは既存型を正本とし、選挙裁定以外のfailure variantを追加しない。

## PluginDiagnostic

`PluginDiagnostic`は`HostSnapshot`のread-only projectionである。record/owned path/compile/doctor観測を利用者可視状態へ写像するが、hostやrecordを修復しない。failureを成功へ変換するentityではない。

## Lifecycle and ownership

1. 内部`discoverPlugins`がdescriptorを列挙する。
2. inspectがready/rejectedを確定し、rejectedはwrite前に終了する。
3. ready planをtemp transactionへ適用し、compile/sensor成功後にjournal PREPAREDを確定して三面をcommitする。
4. dropはrecord-owned path/contributionのcurrent一致を確認し、temp compile/doctor成功後に同じjournal protocolでcommitする。
5. crash/handled failureはpre-stateへ回復し、COMMITTEDだけを成功とする。
6. diagnoseは任意時点のhostをread-only投影する。U12がtargeted evidenceをledgerへ集約する。

## Non-entities

- `test-pro` sourceとauthoring guideはU11、projected bundle ownershipはU09である。
- marketplace、lockfile、agents/scopes/memory/knowledge、`when` evaluatorは存在しない。
- frontend component、API resource、database row、AWS resourceは存在しない。

## Upstream input traceability

| Input | Entity設計への実質利用 |
|---|---|
| `unit-of-work.md` | 6 public seam、transaction/record、U11境界をvalue graphへ固定 |
| `unit-of-work-story-map.md` | item 20だけをU10 entityへ閉じ、U11/U12 entityを除外 |
| `requirements.md` | no-clobber、seam/fragment、compile/doctor、loud failureをinvariant化 |
| `components.md` | C4 union/CLI、既存C1/C2、deferred面不在を固定 |
| `component-methods.md` | 正準union・引数・返却型・transaction lifecycleを使用 |
| `services.md` | invocation-local inspect→commit workflow、workspace atomicityを固定 |
