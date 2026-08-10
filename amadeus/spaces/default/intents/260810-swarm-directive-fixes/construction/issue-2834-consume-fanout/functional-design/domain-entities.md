# Domain Entities — issue-2834-consume-fanout

入力: [`unit-of-work.md`](../../../inception/units-generation/unit-of-work.md)、[`unit-of-work-story-map.md`](../../../inception/units-generation/unit-of-work-story-map.md)、[`requirements.md`](../../../inception/requirements-analysis/requirements.md)、[`components.md`](../../../inception/application-design/components.md)、[`component-methods.md`](../../../inception/application-design/component-methods.md)、[`services.md`](../../../inception/application-design/services.md)。

## Value Objects

| Entity | Fields | Invariant |
|---|---|---|
| DeclaredProducerUnit | slug, declarationIndex | slugは一意、indexはstable order |
| ProducerUnitStatus | unit, outcome | outcomeは`succeeded | cancelled | failed | pending | unknown` |
| EffectiveProducerPopulation | succeeded, cancelled, blocking | 3集合は排他的。fan-out可能時はsucceeded非空・blocking空 |
| ArtifactConsumeTemplate | artifactSlug, producerStage, pathTemplate, artifactIndex, required | producerが配置規則を所有 |
| ResolvedConsume | artifactSlug, unitSlug, concretePath, unitIndex, artifactIndex | 対象経路では`{unit-name}`なし |
| AbsentConsume | path, artifactSlug, required, expected | succeeded Unitのrequired gapは`expected:false` |
| ConsumeResolutionError | code, stage, producer, units, detail, expectedInventory?, actualInventory? | 部分的なresolved listと同時に返さない。inventory drift時はexpected / actualのconsumer・edge集合を必須にする |

## Result Unions

```ts
type PopulationResult =
  | { ok: true; population: EffectiveProducerPopulation }
  | { ok: false; error: ConsumeResolutionError };

type ConsumerInputResolution =
  | { ok: true; consumes: readonly string[]; consumesAbsent: readonly AbsentConsume[] }
  | { ok: false; error: ConsumeResolutionError };
```

error codeは少なくとも`zero-declared-units`、`zero-succeeded-units`、`blocking-unit-outcome`、`ambiguous-unit-outcome`、`unresolved-unit-placeholder`、`presence-read-failed`、`consumer-edge-inventory-mismatch`を区別する。最後のcodeはexpected / actualのconsumer slug集合と`consumer:artifact` edge集合を必須payloadに持つ。callerだけがこれを既存`kind:"error"` directiveへ変換し、全codeでcursorを不変にする。

## Relationships and Transformations

DeclaredProducerUnitとU1のOutcomeProjectionをUnit slugで照合してEffectiveProducerPopulationを作る。ArtifactConsumeTemplateとpopulation.succeededは直積関係で、各組をResolvedConsume 1件へ写像する。ResolvedConsumeはpresence判定後、present pathまたはAbsentConsumeの排他的な一方へ移る。

OutcomeProjectionはorchestrator adapterが公開入力として渡す。U2のpure entity / functionはU1 moduleをimport・変更・直接実行せず、projection生成の実行順を所有しない。

cancelledとblockingはResolvedConsumeを生成しない。ただしcancelledは正常な除外、blockingはConsumerInputResolution全体のerrorであり、両者を同じ「不在」として扱わない。

## Lifecycle Constraints

- templateはstage graph compile結果から読み、fan-out中にproducer identityを変更しない。
- stable sortを後付けせず、宣言順の直積生成で順序を構成する。
- dedupe keyは正規化済みconcrete path。別artifactが同一pathへ解決した場合も最初の出現を保持する。
- presenceはfan-out完了後のsnapshotで一度評価し、途中失敗時は全結果を破棄する。
- reviewer guardはdirectiveを変更せず、required gapの拒否または全present inputsのscope化だけを行う。
- persistent cache、新directive schema、新workflow stateは導入しない。
