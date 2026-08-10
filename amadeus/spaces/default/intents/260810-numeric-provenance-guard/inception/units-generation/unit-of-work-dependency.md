# Unit of Work Dependency — 成果物数値の provenance ガード

上流参照: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。各Unitの定義とcanonical kindは `unit-of-work.md` を正本とする。

## Dependency DAG

direct edgeは「A depends on B」を表す。

- `numeric-provenance-sensor-cli` depends on `numeric-provenance-mapping-contract`: Design-time Artifact Index、sweep generator、runtime classifier、近傍窓、mode、配線stage集合は、実行コード非依存のschema・承認fixture・受け入れ条件なしに実装できない。
- `numeric-provenance-distribution` depends on `numeric-provenance-sensor-cli`: 投影・配送先fireの入力となるtool、manifest、stage配線が必要である。
- その他のdirect edgeはない。transitive edgeを重複記載しない。

```yaml
units:
  - name: numeric-provenance-mapping-contract
    kind: spec
    depends_on: []
  - name: numeric-provenance-sensor-cli
    kind: service
    depends_on: [numeric-provenance-mapping-contract]
  - name: numeric-provenance-distribution
    kind: packaging
    depends_on: [numeric-provenance-sensor-cli]
```

## Integration contracts

| Producer Unit | Consumer Unit | Contract | Communication |
| --- | --- | --- | --- |
| `numeric-provenance-mapping-contract` | `numeric-provenance-sensor-cli` | Design-time Artifact Indexの契約、mapping schema、承認fixture、W/mode/stage集合の受け入れ条件 | consumed-in-placeのspec/file参照。同期、networkなし |
| `numeric-provenance-sensor-cli` | `numeric-provenance-distribution` | core tool、sensor manifest、stage frontmatter、integration test surface | 既存buildのdirectory projection。同期、networkなし |

既存dispatcherはU2の外部既存dependencyであり、新しいUnitとして再定義しない。runtime data flowはdispatcher→U2→verdict→dispatcherの同期契約、design-time flowはU1 contract→U2のMapping非依存index/sweep→生成mapping、distribution flowはU2→U3である。U1はU2所有コードや生成結果へ依存しない。

## Acyclicity and parallelism

YAML edge blockのnode数は3、direct edge数は2で、自己依存と未宣言node参照はない。各edgeはcontract producerからconsumerへの一方向であり、逆edgeがないためcycle-freeである。

互いに到達不能な新規Unitの集合はないため、Unit全体を独立に並列実装できる集合は空である。これは実装順序の推奨ではなく、現DAG上の独立性に関する事実である。Unit内部の作業分担や、どの有効なtopological pathをBoltへ割り当てるかはDelivery Planningが決める。

## Shared resources

- U1/U2が共有するのは実行コード非依存のmapping schema、受け入れ条件、fixtureであり、実装ファイルやmutable datastoreを共有所有しない。
- U2/U3が共有するのはcore source treeと既存build manifestであり、runtime stateではない。
- audit、runtime graph、dispatcherは既存framework resourceであり、各Unitはread/consumeまたは既存経路利用に限定する。
- DB、queue、REST、gRPC、AWS resource、UI stateは存在しない。
