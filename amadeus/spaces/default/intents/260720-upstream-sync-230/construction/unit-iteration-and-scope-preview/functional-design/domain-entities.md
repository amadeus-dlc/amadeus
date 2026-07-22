# Domain Entities — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
WorkflowState + StageGraph -> nextConstructionStep -> ConstructionStep
ScopeName + CompiledGrid -> previewScopeCost -> ScopeSummary
```

すべてC2の一回のCLI invocation内で使うimmutable decision valueであり、database aggregate、network resource、UI stateではない。

## WorkflowState and construction iteration

`WorkflowState`はoptionalな`Construction Iteration`を保持する。未指定は既存stage-major semanticsで、値がないこと自体を新しいdefault文字列としてserializeしない。`unit-major`はstate verbで明示された場合だけ有効である。

不正値は有効なstate entityへ昇格せず、state、plan、graph、auditの全mutation前に拒否される。U05は新しいerror variantを定義せず、既存state validation/CLI mappingを使う。

## StageGraph and ConstructionStep

`StageGraph`はcompiled stage順、scope/eligibility、per-unit関係、coverage判定の正本である。unit-majorは既存Unit順を外側、graphのcompiled stage順を内側にして最初の未完了eligible pairを選ぶ。

`ConstructionStep`は`nextConstructionStep`の正準返却型である。具体fieldやfailure variantは既存型を正本とし、functional designで新しいsignatureを作らない。decision value自身はstate mutationやaudit emitを行わない。

## ScopeName, CompiledGrid, and ScopeSummary

`ScopeName`はpreview対象scopeのidentity、`CompiledGrid`はeffective in-scope stageとgateの正本である。各consumerがstage sourceを再parseせず、このgridだけからcountする。

`ScopeSummary`はstage数とgate数を一度だけ保持する正準返却型である。同じinstance semanticsをscope confirmation、intent birth、scope-change、validate-gridのhuman/JSON projectorが消費する。JSONでは既存payloadを置換せずadditiveな`summary`として投影する。

## Lifecycle and interactions

1. state verbがiteration入力を検証し、未指定または`unit-major`の有効stateを作る。
2. `nextConstructionStep`が`WorkflowState`と`StageGraph`からstage-majorまたはunit-majorの次stepをpureに決める。
3. 後続の既存transactionだけがstate/auditを更新する。
4. `previewScopeCost`が`ScopeName`と`CompiledGrid`から一つの`ScopeSummary`を作る。
5. 4 consumerが同じsummary semanticsをhuman/JSONへ投影する。U12がtargeted evidenceを全体ledgerへ集約する。

## Non-entities

- Unit kind/schemaはU01、swarm batch/next-stage resolutionはU03のentityである。
- consumer別count cacheや第二compiled gridは存在しない。
- 未指定iterationを表すserialized `stage-major`追加fieldは存在しない。
- frontend component、API resource、database row、AWS resourceは存在しない。

## Upstream input traceability

| Input | Entity設計への実質利用 |
|---|---|
| `unit-of-work.md` | 2 public seamとopt-in/default/summary境界をvalue graphへ固定 |
| `unit-of-work-story-map.md` | items 8–9だけをU05 entityへ閉じ、U01/U12 entityを除外 |
| `requirements.md` | iteration状態、順序、拒否、不変bytes、stage/gate summaryをinvariant化 |
| `components.md` | C2 invocation-local pure valueと既存state/graph/CLI再利用を固定 |
| `component-methods.md` | 2関数の正準引数・返却型をinteractionへそのまま使用 |
| `services.md` | 同期CLI lifecycle、既存transaction、DB/network/UIなしを固定 |
