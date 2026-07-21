# Domain Entities — swarm-and-next-stage

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
BoltDag + RunEvidence -> selectNextSwarmBatch -> BatchSelection
StageSlug + CompiledGrid -> resolveNextInScopeStage -> StageSlug | null
```

これらはC2の一回のCLI invocation内で生成・消費されるimmutable valueである。database entity、network resource、UI stateではなく、既存orchestrator/state/swarmが共有するpure decision input/outputである。

## BoltDag

`BoltDag`はUnit dependencyから構築・U02で回復されたbatch列を保持する。U03はbatchの格納順をそのままtopological execution orderとして消費し、再ソートや別tie-breakを導入しない。DAGの再計算、欠落修復、coverage集合の再構築はU02の責務である。

U03にとってのidentityはbatch位置とunit identityの組である。同じunitを別batchへ移す、複数batchを一つへ連結する、後続batchを先に選ぶ振る舞いは持たない。

## RunEvidence

`RunEvidence`はcurrent runに属するunit結果を表し、convergedであるか、merge failureを持つかを選択判定へ供給する。U03はcurrent run以外のclaimを完了根拠として消費しない。

merge failureを持つunitは、先行するcheck結果にかかわらずconverged entityとして扱わない。これは新しいfailure variantを定義するものではなく、既存`RunEvidence`の消費規則である。worker checkやmerge自体はこのentityのmethodではない。

## BatchSelection

`BatchSelection`は`selectNextSwarmBatch`の正準返却型であり、DAG順で最初の未完了batchと、そのbatch内の未完了unitを表す。具体的fieldやno-selection variantは既存型を正本とし、U03 functional designで新しいsignatureやfailure policyを追加しない。

selectionはdispatch command、state mutation、audit eventではない。後続orchestratorが既存境界で投影するためのdecision valueである。

## CompiledGrid and StageSlug

`CompiledGrid`はscope別stage順とeffective in-scope/SKIP判定の正本である。U03は別のstage listやdisplay-only sequenceを作らず、currentの後方にある最初のin-scope entryだけを解決する。

`StageSlug`は実在stage identityである。SKIP entryは次stage identityにならない。in-scope successorが存在しない場合は`StageSlug`を捏造せず、正準signatureどおり`null`を返す。

## Lifecycle and interactions

1. U02が回復済み`BoltDag`を供給し、swarm実行面がcurrent `RunEvidence`を供給する。
2. `selectNextSwarmBatch`がDAG順、current-run converged、merge-failure非convergedを適用して`BatchSelection`を返す。
3. gate生成時にcurrent `StageSlug`と`CompiledGrid`を`resolveNextInScopeStage`へ渡す。
4. resolverはSKIPを除外した実在successorまたはterminal `null`を返す。
5. gate projectorとengine nextが同じdecision semanticsを使用する。U12はtargeted evidenceを全体ledgerへ集約する。

## Non-entities

- merge executor、worker process、worktree、audit rowはU03 domain entityではない。
- Bolt DAG recovery resultはU02、unit-major cursorとscope summaryはU05のentityである。
- `none`やSKIP stage名はterminal `StageSlug`ではない。
- frontend component、API resource、database row、AWS resourceは存在しない。

## Upstream input traceability

| Input | Entity設計への実質利用 |
|---|---|
| `unit-of-work.md` | `BoltDag`、`RunEvidence`、`BatchSelection`、`CompiledGrid`、`StageSlug`を2 public seamへ限定 |
| `unit-of-work-story-map.md` | items 3/10だけをU03 entityへ閉じ、U12 ledger entityを含めない |
| `requirements.md` | current-run convergence、merge failure、SKIP非identity、terminal nullをentity invariantへ反映 |
| `components.md` | C2 invocation-local pure valueと既存orchestrator/state/swarm再利用を固定 |
| `component-methods.md` | 2関数の正準引数/返却型をそのままentity interactionに使用 |
| `services.md` | 同期CLI内のvalue lifecycle、DB/network/UI entityなしを固定 |

