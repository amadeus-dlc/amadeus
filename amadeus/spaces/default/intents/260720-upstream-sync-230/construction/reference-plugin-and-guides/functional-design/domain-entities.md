# Domain Entities — reference-plugin-and-guides

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
TestProSource -> HarnessProjection[6] -> PluginBundle
PluginBundle + TempHost -> Composition -> Diagnostic -> Drop
LifecycleEvidence + GuideSurface -> U12 evidence input
```

U11のentityはreference fixtureとdocs/evidence valueであり、新runtime aggregateではない。

## TestProSource

`TestProSource`は`plugins/test-pro/`に置くcanonical authoring sourceで、C1-valid manifest、宣言stage、4 seam/fragmentを実証する最小artifact集合を表す。具体slug、文言、fixture pathはidentity contractに含めない。

generated harness treeやself-install treeはsource entityではない。marketplace、lockfile、agents/scopes/memory/knowledge、`when` evaluator stateも持たない。

## Lifecycle fixture

fixtureは一つのtemp repository/host snapshot内でsource、6 projection、bundle、compose record、doctor observation、drop resultを関連付ける。所有するのはfixture inputs/expected declarative outcomesだけで、U09/U10 implementationやpublic APIではない。

success outcomeは宣言成果物の生成・doctor検出・drop除去とunrelated bytes不変である。failure outcomeは既存U10 errorと三面不変を観測する。どちらもtracked tree一時物0を必須とする。

## GuideSurface and LifecycleEvidence

`GuideSurface`はauthoring path/namespace、supported/deferred、no-clobber、verification、6/4差の必須topic集合である。具体 proseは更新可能で、固定文言をAPIにしない。

`LifecycleEvidence`は6 package matrix、4 self-install matrix、compose/doctor/drop結果、tracked-tree cleanlinessをitem 21/22へtraceするvalueである。U12がこれを全体ledgerへ集約し、U11はledger stateを変更しない。

## Non-entities

- runtime plugin registry、marketplace、lockfile、remote fetchは存在しない。
- composition transaction/recordはU10、projection build resultはU09のentityである。
- frontend component、API resource、database row、AWS resourceは存在しない。

## Upstream input traceability

| Input | Entity設計への実質利用 |
|---|---|
| `unit-of-work.md` | TestProSource、fixture、guide、new APIなしを固定 |
| `unit-of-work-story-map.md` | items 21–22だけをU11 entityへ閉じる |
| `requirements.md` | 6面、単一E2E、declarative outcomes、temporary 0をinvariant化 |
| `components.md` | C4 reference/C7 docs-evidence境界を固定 |
| `component-methods.md` | C4/C5既存entityを参照し再定義しない |
| `services.md` | package/host lifecycleをfixture interactionへ使用 |

