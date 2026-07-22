# Domain Entities — stage-contract

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
UNIT_KINDS (amadeus-lib.ts)
  └─ UnitKind
      ├─ UnitDependencyEdge.kind?
      └─ StageFrontmatter.produces_kinds[artifact][]

Stage source frontmatter
  └─ StageFrontmatter
      └─ GraphStage
          ├─ directive candidate paths
          └─ per-unit required coverage

unit-of-work-dependency.md
  └─ UnitDependencyEdge[]
      └─ runtime-graph.bolt_dag.units[]
```

## UnitKind

`UnitKind`はUnitが「何を生成するか」ではなく「何であるか」を表すvalue objectである。値は`service`、`spec`、`ui`、`packaging`、`library`の5つに閉じる。`amadeus-lib.ts`が`UNIT_KINDS as const`と派生union typeを所有し、第二定義を認めない。

| 値 | 意味 | 本intent |
|---|---|---|
| `service` | deployed executable / standalone runtime | 0件 |
| `spec` | その場で消費されるcontract/schema | U01 |
| `ui` | frontend surface | 0件 |
| `packaging` | build/distribution artifact | U09、U11 |
| `library` | standalone runtimeを持たないreusable code | U02–U08、U10、U12 |

この写像はE-USSUFD2で3–0採用された。U10は配布物そのものではなくembedded composition engineなので`library`である。

## StageFrontmatter and ProducesKinds

`StageFrontmatter`の追加metadataは次のexact-shapeを持つ。全てoptionalで、sourceにないkeyはtyped objectにも生成しない。

| field | accepted type / shape | normalization |
|---|---|---|
| `number` | string、`^\d+\.\d+$` | 値を保持 |
| `name` | 非空string | 値を保持 |
| `bundle` | 非空string | 値を保持 |
| `when` | `{ "producer-in-plan": <non-empty artifact slug> }`、exactly one key | block/inlineを同じobjectへparse、評価しない |
| `required_sections` | 非空stringの配列 | 値とauthored orderを保持 |

追加trim、dedupe、sort、predicate拡張は行わない。wrong type、空値、unknown/複数predicateは`ContractResult.invalid`であり、graphへ投影しない。

`StageFrontmatter`は既存fieldに加えて`produces_kinds?: Record<string, UnitKind[]>`を持つ。mapのkeyはartifact slug、valueは適用kindの非空集合である。artifactがmapに存在しない場合は全kind適用であり、空集合で「全除外」を表現しない。

`optional_produces`はrequired集合からの免除を表し、kind適用性とは直交する。候補pathはrequired/optionalをunionしてkind-filterし、coverage集合はrequiredだけをkind-filterする。

## UnitDependencyEdge and BoltDagUnit

`UnitDependencyEdge`は`name`、`depends_on`に加えて`kind?: UnitKind`を持つ。kindはunits-generationのedge blockで人間が確認し、required-sections sensorとparserがenum検証する。runtime compile後の`BoltDagUnit`は同じkindを任意fieldとして保持する。

kind未指定は「不明」ではなく互換性契約としてfull matrixを意味する。runtime graphの欠落や読取失敗もkindなしへ縮退し、artifactを過剰に省略しない。

## ContractResult and errors

`validateStageFrontmatter`と`normalizeUnitKind`は例外的なpartial mutationをせず、判別可能な結果を返す。

```ts
type ContractResult<T> =
  | { kind: "ok"; value: T }
  | { kind: "invalid"; errors: readonly StageContractError[] };
```

`StageContractError`は最低限、field/path、actual value、expected constraintを持つ。複数の独立不備は可能な範囲で収集するが、invalid結果からgraph/state mutationへ進めない。

## Public operations

```ts
function validateStageFrontmatter(raw: unknown, context: ValidationContext): ContractResult<StageFrontmatter>;
function normalizeUnitKind(raw: unknown): ContractResult<UnitKind>;
function compileStageGraph(stages: readonly StageFrontmatter[]): ContractResult<readonly GraphStage[]>;
function requiredArtifactsForUnit(stage: GraphStage, kind: UnitKind): readonly string[];
```

この4関数だけがpublic seamである。`parseStageFrontmatter`、`emitStageFrontmatter`、`filterProducesByKind`は内部operationで、独立domain APIではない。kind未指定Unitはcallerがfull matrixへ委譲し、`requiredArtifactsForUnit`の`UnitKind`引数をoptionalへ変更しない。

## Lifecycle and ownership

1. authorがstage frontmatterとUnit edge blockを記述する。
2. lib parserが構文を正規化し、stage-schema/edge parserがclosed vocabularyと参照整合を検証する。
3. graph compilerが`GraphStage.produces_kinds`と`BoltDagUnit.kind`へ投影する。
4. orchestratorが同一snapshotからdirectiveとcoverageを導出する。
5. state approval guardがall-vacuousを含む同じ適用集合を検査する。

E-USSUFD1はlib所有を2–1で採用した。少数票のstage-schema凝集案は、既存`stage-schema → lib`依存とfrontmatter parse/emit所有を踏まえ非採用。記録は`amadeus/spaces/default/elections/E-USSUFD1/record.md`、kind写像は`E-USSUFD2/record.md`にある。

## Non-entities

- `when` evaluator、plugin manifest、composition planはU01のentityではない。
- frontend component、database entity、network service、AWS resourceは本Unitに存在しない。
- runtime graphはderived snapshotであり手編集の正本ではない。
- `dist/`の型定義は生成物であり、domain ownerではない。

## 実装裁定追補(2026-07-22)

公開 seam 4関数のうち `compileStageGraph` の実装 signature は申告済み逸脱(既存 disk 読み込み型を再利用)、`filterProducesByKind` は独立 operation としては存在しない(`requiredArtifactsForUnit` 内インライン)。正準文は business-logic-model.md「実装裁定追補(2026-07-22)」を参照。
