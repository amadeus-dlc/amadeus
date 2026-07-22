# NFR Design Questions — swarm-and-next-stage

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順8/12 / 正本Unit U03 `swarm-and-next-stage`。承認済みNFRと正準2 pure seamを、既存orchestrator/state/swarmのbatch選択・next-stage解決境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU14ND1 recorded裁定 `2026-07-21T03:28:27Z`。

## 質問不要案の根拠

- Public seam: `selectNextSwarmBatch`と`resolveNextInScopeStage`の正準2関数だけで、state、audit、workspace I/Oを所有しない。
- Batch: U02回復済みBoltDagを記録順に評価し、currentRunで最初の未完了batch内の未完了unitだけを返す。
- Convergence: currentRunのconverged evidenceだけを完了根拠とし、merge failureと別run claimはadvance根拠にしない。
- Next stage: CompiledGridのcurrent後方をcompiled orderで評価し、SKIPを除いた最初の実在in-scope stageを返し、終端は`null`とする。
- Consistency: gateの`next_stage` projectorとengine `next`は同じresolver結果を使用する。
- Compatibility: FR-0 EQUIVALENT面はproduction observable差分0とし、targeted regression evidenceだけを残す。

新signature、`BatchSelection` shape、no-selection variant、tie-break、failure policy、malformed-grid handling、terminal value、ownership、parallelism/retry/cache、dependency、service、SLOを選ぶ余地はない。新判断は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可 — 既決契約から機械導出できる。E-USSU14ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票、留保なしで裁定した（開票 `2026-07-21T03:28:27Z`）。承認範囲は正準2 pure seam、BoltDag記録順、currentRun convergence、merge failure非収束、CompiledGrid順、SKIP除外、terminal `null`、gate-engine同一resolver、FR-0 EQUIVALENTを既決契約から機械導出する範囲に限定する。新shape、tie-break、failure policy、terminal、ownership、policy、dependency、service、SLOは追加しない。
