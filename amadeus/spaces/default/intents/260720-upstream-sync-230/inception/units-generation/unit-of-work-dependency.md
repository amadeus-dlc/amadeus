# Unit of Work Dependency — upstream-sync-230

> 上流入力(consumes 全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。`stories.md` は本 scope で SKIP 済み。

この成果物は topology のみを表す。edgeは「Unit Aが`depends_on`にBを持つ = A depends on B」。実装順、critical path、価値/リスク優先、最初のBoltは決めない。

## Machine-readable DAG

```yaml
units:
  - name: stage-contract
    kind: spec
    depends_on: []
  - name: runtime-recovery
    kind: library
    depends_on: []
  - name: swarm-and-next-stage
    kind: library
    depends_on: [runtime-recovery]
  - name: routing-and-autonomy-guards
    kind: library
    depends_on: []
  - name: unit-iteration-and-scope-preview
    kind: library
    depends_on: [stage-contract]
  - name: workspace-inspection
    kind: library
    depends_on: []
  - name: harness-hook-correctness
    kind: library
    depends_on: []
  - name: reviewer-protocol
    kind: library
    depends_on: []
  - name: plugin-projection
    kind: packaging
    depends_on: [stage-contract]
  - name: plugin-composition
    kind: library
    depends_on: [stage-contract, runtime-recovery, plugin-projection]
  - name: reference-plugin-and-guides
    kind: packaging
    depends_on: [plugin-projection, plugin-composition]
  - name: verification-and-ledger-closure
    kind: library
    depends_on: [stage-contract, runtime-recovery, swarm-and-next-stage, routing-and-autonomy-guards, unit-iteration-and-scope-preview, workspace-inspection, harness-hook-correctness, reviewer-protocol, plugin-projection, plugin-composition, reference-plugin-and-guides]
```

## 依存理由とintegration point

| dependent | dependency | integration point |
|---|---|---|
| swarm-and-next-stage | runtime-recovery | self-healed Bolt DAGとcurrent-run convergence |
| unit-iteration-and-scope-preview | stage-contract | Unit kind/compiled grid |
| plugin-projection | stage-contract | plugin stage schemaとcanonical serialization |
| plugin-composition | stage-contract | manifest/stage validation |
| plugin-composition | runtime-recovery | composition後のruntime graph self-heal compile |
| plugin-composition | plugin-projection | C5生成済みhost plugin bundle |
| reference-plugin-and-guides | plugin-projection | 6面projection/4面self-install evidence |
| reference-plugin-and-guides | plugin-composition | compose/doctor/drop transaction |
| verification-and-ledger-closure | 全先行11 Unit | item/test/docs evidence、最終SHA、gate結果 |

新規network API/event/shared databaseはない。integrationはtyped TypeScript contract、CLI result、filesystem artifact/transaction、generated projectionに限定する。

## 並行可能性

依存関係を持たない antichain の例を示すが、実行優先は定めない。

- `{stage-contract, runtime-recovery, routing-and-autonomy-guards, workspace-inspection, harness-hook-correctness, reviewer-protocol}` は相互非依存。
- `stage-contract`成立後、`unit-iteration-and-scope-preview` と `plugin-projection` は相互非依存。
- `runtime-recovery`成立後の`swarm-and-next-stage`は、workspace/harness/reviewer系と相互非依存。
- `verification-and-ledger-closure`だけは全11 Unitの証拠へ依存する。

E-USSUG1 e3 GoA2留保をDelivery Planningへ引き渡す: `stage-contract`（plugin contractを含む）、`plugin-projection`、`plugin-composition`、`reference-plugin-and-guides` は独立検証可能な4 Bolt境界を保つ。どのBoltを先に選ぶかはここでは決めない。

## DAG検証

- 宣言Unit: 12、重複0、未知dependency 0、self-edge 0。
- root Unit: 6、leaf Unit: `verification-and-ledger-closure`。
- cycle: 0。全edgeは `component-dependency.md` のprovider→consumer方向またはfinal evidence集約方向と一致する。
