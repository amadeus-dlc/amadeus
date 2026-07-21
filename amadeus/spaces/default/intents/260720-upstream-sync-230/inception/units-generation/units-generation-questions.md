# Units Generation 質問票 — upstream-sync-230

> 上流入力(consumes 全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。`stories.md` は本 scope で SKIP 済み。

## Q1: Unit granularity

既存7 componentをConstructionで独立検証可能なUnitへどう分割するか。実装順・critical path・最初にshipするBoltは Delivery Planning に委譲し、ここではDAGだけを確定する。

1. **12 capability-cohesive Units（推奨）** — C2の大きなruntime変更を recovery/gate、swarm/naming、routing/guard、iteration/previewへ分け、pluginもcontract/projection/composition/referenceへ分ける。各Unitにtest/docsを同乗させ、最後にevidence/ledger closureを置く。小batch・独立検証・最大4並行に最も適合する一方、Unit間contract管理が増える。
2. **7 component-aligned Units** — C1–C7をそのままUnit化する。境界は単純だが、C2とC7がXLになり、Bolt差分とreview負荷が集中する。
3. **9 balanced Units** — C2だけを3分割し、他componentは概ね一対一にする。管理量は中間だが、plugin projection/composition/referenceの変更理由が一Unitへ凝集しすぎる。

[Answer]: 1. 12 capability-cohesive Units。E-USSUG1で3-0採用、GoA favor 3、verify成功/recorded（裁定 2026-07-20T07:52:27Z、記録 `amadeus/spaces/default/elections/E-USSUG1/record.md`）。e3 GoA2留保を引継ぐ: plugin contract/projection/composition/referenceの4 Unitは、Delivery Planningでも独立検証可能なBoltとして維持する。

## 既決の4次元

- Unit boundary strategy: feature/capability + change-control seam。component境界を越えるcross-cutting tests/docsは実装Unitへ同乗する。
- Dependency: `A depends on B` のcycle-free YAML DAG。独立Unitの並行可能性だけを示し、経済的順序は記録しない。
- Integration: C1 typed contract、C2 compile/state seam、C5 projected bundle、filesystem transaction。新規API/event/networkなし。
- Deployment: 全Unitとも既存repository/CLIへembedded。独立service deploymentなし。
