# Pi Coding Agent対応 — Unit依存DAG

## DAG方針と上流トレーサビリティ

本DAGは`components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`から導出したtopologyである。`stories`は本scopeで生成されていないため、SCN-001〜009とM1〜M10の実現依存を代用する。ここでは経済的な実装順、Bolt sequence、critical pathを選ばない。

edgeは「行のUnitが`depends_on`内のUnitへ直接依存する」を意味する。共通coreがPi overlayへ逆依存しないApplication Designの原則を維持する。

## Machine-readable dependency graph

```yaml
units:
  - name: pi-harness-foundation
    kind: packaging
    depends_on: []
  - name: setup-transaction-safety
    kind: library
    depends_on: []
  - name: pi-lifecycle-gate-adapter
    kind: library
    depends_on: []
  - name: pi-child-execution-driver
    kind: library
    depends_on: []
  - name: pi-distribution-installation
    kind: packaging
    depends_on: [pi-harness-foundation, pi-lifecycle-gate-adapter, pi-child-execution-driver, setup-transaction-safety]
  - name: pi-doctor-diagnostics
    kind: library
    depends_on: [pi-harness-foundation, pi-lifecycle-gate-adapter, pi-child-execution-driver, pi-distribution-installation]
  - name: pi-user-maintainer-guides
    kind: spec
    depends_on: [pi-lifecycle-gate-adapter, pi-child-execution-driver, pi-distribution-installation, pi-doctor-diagnostics]
  - name: pi-conformance-evidence
    kind: library
    depends_on: [pi-lifecycle-gate-adapter, pi-child-execution-driver, pi-distribution-installation, pi-doctor-diagnostics, pi-user-maintainer-guides]
```

## 依存関係とintegration contract

| Unit | Direct dependencies | Integration point |
|---|---|---|
| `pi-harness-foundation` | なし | `HarnessManifest`、`.pi` tree、discovered manifest catalog |
| `setup-transaction-safety` | なし | setup `Plan`、filesystem transaction ports、install manifest |
| `pi-lifecycle-gate-adapter` | なし | 既存core contract、extension registration、canonical hook/presence/continuation ports |
| `pi-child-execution-driver` | なし | 既存core contract、Pi RPC protocol、driver/result、audit identity |
| `pi-distribution-installation` | harness foundation、lifecycle、child driver、transaction safety | 全Pi resourceを束ねるsetup payload、transaction plan、root Pi metadata、hash manifest |
| `pi-doctor-diagnostics` | harness foundation、lifecycle、child driver、distribution | harness identity、capability/resource probes、typed checks |
| `pi-user-maintainer-guides` | lifecycle、child driver、distribution、doctor | verified public behavior、manifest catalog、diagnostic IDs |
| `pi-conformance-evidence` | lifecycle、child driver、distribution、doctor、guides | fixture inventory、live driver、dogfood checklist、docs/parity checks |

## Parallel development opportunities

次の集合内には相互依存がないため、同じreadiness levelで並行実装できる。これは複数の有効なtopological orderingを示すだけで、推奨順ではない。

- `{pi-harness-foundation, pi-lifecycle-gate-adapter, pi-child-execution-driver, setup-transaction-safety}`は相互に直接依存しないroot Unitである。
- `pi-distribution-installation`は上記4 Unitのresource/contractを束ねるため、それらへ技術依存する。

`pi-doctor-diagnostics`は検査対象となる4 surfaceのcontractを消費する。`pi-user-maintainer-guides`はpublic behaviorを消費し、`pi-conformance-evidence`は全surfaceとguide contractを横断検証する。これらは依存成立条件の説明であり、Bolt groupingや経済的な実行順を指定しない。

## Cycle、共有resource、failure境界

- DAGはcycle-freeで、自己依存はない。
- 共通shared resourceはauthored harness manifest catalog、setup install manifest、intent audit/state、Pi binary/provider environmentである。
- `setup-transaction-safety`だけがsetup journal/backupを所有する。
- `pi-child-execution-driver`だけがchild process lifetimeを所有する。
- `pi-lifecycle-gate-adapter`だけがPi native eventからcanonical hookへの変換を所有する。
- `pi-conformance-evidence`はconsumerとして検証し、本番contractを再実装しない。
