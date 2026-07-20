# Unit of Work Dependency — 形式検証対照実験

## 上流入力とDAG制約

`components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`から直接依存だけを抽出する。E-FVEADS13Rのblind state machineをtopology制約として反映するが、推奨実装順、critical path、WSJF、risk / value priorityは決めずDelivery Planningへ委譲する。

## Machine-readable direct edges

```yaml
units:
  - name: experiment-contract-provenance
    depends_on: []
  - name: sealed-fixture-registry
    depends_on: [experiment-contract-provenance]
  - name: execution-evidence
    depends_on: [experiment-contract-provenance]
  - name: tla-arm-toolchain
    depends_on: [experiment-contract-provenance]
  - name: tla-invalid-timestamp-skeleton
    depends_on: [experiment-contract-provenance, sealed-fixture-registry, execution-evidence, tla-arm-toolchain]
  - name: ts-arm
    depends_on: [experiment-contract-provenance, tla-invalid-timestamp-skeleton]
  - name: full-matrix-suite
    depends_on: [experiment-contract-provenance, sealed-fixture-registry, execution-evidence, tla-arm-toolchain, tla-invalid-timestamp-skeleton, ts-arm]
  - name: eligibility-report
    depends_on: [experiment-contract-provenance, sealed-fixture-registry, execution-evidence, tla-arm-toolchain, tla-invalid-timestamp-skeleton, ts-arm, full-matrix-suite]
```

## Edge rationale / integration contracts

| Dependent | Direct dependency | Contract |
| --- | --- | --- |
| sealed-fixture-registry | experiment-contract-provenance | defect / disclosure event schema、canonical hash |
| execution-evidence | experiment-contract-provenance | `CellResult` / `ArmSuiteResult` parser |
| tla-arm-toolchain | experiment-contract-provenance | public contract、`TlcProfile`、verdict normalization |
| tla-invalid-timestamp-skeleton | sealed-fixture-registry | freeze後のsealed #1252 reveal |
| tla-invalid-timestamp-skeleton | experiment-contract-provenance | typed ports / injected dispatcherを使う専用integration harness |
| tla-invalid-timestamp-skeleton | execution-evidence | runner port、append-only raw evidence |
| tla-invalid-timestamp-skeleton | tla-arm-toolchain | frozen TLA adapter / verified jar |
| ts-arm | experiment-contract-provenance | public contractだけを入力にする |
| ts-arm | tla-invalid-timestamp-skeleton | `SKELETON_PASSED` eventだけを開始guardに使い、evidence本文を読まない |
| full-matrix-suite | sealed-fixture-registry | 両freeze後のpromoted manifestと正準順 |
| full-matrix-suite | experiment-contract-provenance | Coordinatorのpromotion event、authoring elapsed ledger、freeze SHA / owned paths |
| full-matrix-suite | execution-evidence | suite execution / evidence completeness |
| full-matrix-suite | tla-arm-toolchain | frozen Arm T adapter |
| full-matrix-suite | tla-invalid-timestamp-skeleton | walking-skeleton gate通過証拠 |
| full-matrix-suite | ts-arm | frozen Arm S adapter |
| eligibility-report | experiment-contract-provenance | decision / result schema |
| eligibility-report | sealed-fixture-registry | D-COUNT / trace provenance |
| eligibility-report | execution-evidence | concrete runner / evidence handlersのfinal wiring |
| eligibility-report | tla-arm-toolchain | concrete TLC acquisition / arm handlersのfinal wiring |
| eligibility-report | tla-invalid-timestamp-skeleton | skeleton gate handler / evidenceのfinal wiring |
| eligibility-report | ts-arm | concrete TS arm handlerのfinal wiring |
| eligibility-report | full-matrix-suite | verified matrix / raw cost tuple |

`ts-arm`はskeletonのresult / fixtureをconsumeせず、開始許可eventだけに依存する。これによりtopologyで後続開始を強制しながらblind inputを維持する。

U1はconcrete providerをimportしない。U5は必要なU1 portsとU2〜U4 handlersだけを専用integration harnessへinjectし、U8はU1〜U7の全handlerをdirect importするfinal wiring-only rootである。したがって実装依存は常にrootからsinkへ向かい、意味的な逆edgeもない。

## Cycle / topology verification

- 8 unitは各1回宣言され、unknown / self dependencyは0件。
- すべてのedgeはroot `experiment-contract-provenance`から下流へ向かい、逆edgeはない。
- `eligibility-report`はsinkであり、他unitから依存されない。
- prose表とYAML blockは同じ22 direct edgesを表す。

合否: graph parserのtopological sortが8件を重複なく返し、cycle / unknown / self edgeが0件である。これは複数の有効topological orderingの存在を許し、単一のbuild orderを選ばない。

## Parallel development opportunities

DAG上、`sealed-fixture-registry`、`execution-evidence`、`tla-arm-toolchain`は互いにedgeを持たない。したがってroot contract成立後の独立集合として表現できる。ただし実際に同時着手するか、どのBoltへ束ねるかは本stageでは決めない。

`ts-arm`はblind state machineによりskeleton eventへ依存するため、上記独立集合へ含めない。`full-matrix-suite`と`eligibility-report`も必要な直接依存が揃うまで開始不能である。
