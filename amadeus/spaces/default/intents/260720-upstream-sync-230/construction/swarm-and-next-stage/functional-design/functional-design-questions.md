# Functional Design Questions — swarm-and-next-stage

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> E-OC1承認: 質問0件で進行可。承認TS=`2026-07-20T14:12:59Z`。

## 既決事項

- public seamは`selectNextSwarmBatch(graph: BoltDag, currentRun: RunEvidence): BatchSelection`と`resolveNextInScopeStage(current: StageSlug, grid: CompiledGrid): StageSlug | null`である。
- swarmはBolt DAGに記録されたbatch順で未完了分を選ぶ。
- 完了判定へ使用できるのはcurrent runのconverged evidenceだけで、merge failureはconvergedとして扱わない。
- gateの`next_stage`は実在する次のin-scope stageだけを指し、SKIP stage名を出力しない。終端は`null`である。
- FR-0 characterizationが現行挙動をEQUIVALENTと判定した面には実装差分を作らず、回帰testと根拠だけを残す。
- U03はFR-1 item 3とFR-2 item 10のownerで、U12は全体evidence/ledger集約だけを担う。

[Answer]: 質問0件。leaderのE-OC1承認（`2026-07-20T14:12:59Z`）により、上記既決契約から機械導出できる範囲で成果物化する。新規signature、tie-break、failure policy、終端意味論、ownership判断が必要になった場合は単独決定せず停止し、再付議する。

## Ambiguity analysis

- 曖昧回答: なし。
- 回答間の矛盾: なし。
- 成果物生成に必要な欠落情報: なし。
- 承認範囲外の判断: 追加しない。

