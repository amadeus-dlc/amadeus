# Logical Components — plugin-composition

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component inventory

| Component | Responsibility | Isolation boundary |
|---|---|---|
| Internal Plugin Discoverer | projected bundleをdescriptorとして列挙 | C4内部helper、public非公開 |
| Inspector | same-name/malformed/unknown/clobberを全数検査 | error時plan/write 0 |
| Composition Planner | no-clobber copy・4 seam・fragment・contributionを計画 | pure、暗黙seamなし |
| Drop Planner | record-owned path/contributionだけを逆計画 | user path推測なし |
| Temp Host Verifier | compose sensor / drop doctorを実行 | canonical tree非変更 |
| Contribution Rebuilder | base＋残存寄与を決定順に再構築 | shared file全体非所有 |
| Workspace Transaction | 三面write-set/preimageをPREPARED→COMMITTED | lock内、record/audit once |
| Recovery Coordinator | 未完了PREPAREDをpre-stateへ回復 | 新規操作より先、corruption時停止 |
| Doctor Projector | record/owned path/compile観測を診断へ写像 | read-only、成功ownerでない |

## Data flow

Internal Plugin DiscovererのdescriptorをInspectorが全件検査し、readyの場合だけComposition Plannerへ渡す。planはTemp Host VerifierでC1/C2 compileとsensorを通し、Workspace Transactionが三面へcommitする。dropはDrop Planner、Contribution Rebuilder、Temp Host Verifierのcompile/doctorを通り、同じtransactionへ進む。

lock取得時に未完了PREPAREDがあればRecovery Coordinatorが新規操作より先に処理する。durable COMMITTEDは回復対象ではなく、post-stateを維持する。public seamはInspector、2 Planner、2 apply、Doctor Projectorに対応する正準6関数だけである。

## Failure domainとblast radius

- inspect/planning failure: 三面全体を不変にする。
- temp verification failure: temp host内へ封じる。
- handled transaction failure: 三面preimageへ即時収束させる。
- PREPARED crash: workspace lock内の回復だけへ封じ、新規操作を止める。
- COMMITTED crash: 成立済みpost-stateを保持する。
- drift/corruption: Recovery Coordinatorで追加mutationを止める。
- shared-file drift: Contribution Rebuilderへ進まず三面を保持する。

shared resourceはworkspace lock、durable WAL、host/record/audit writer、C1/C2 compilerだけである。database、queue、network、runtime service、retry engine、別journal storeは存在しない。

## NFR mapping

`performance-requirements.md`の有界pipelineはInspector/Planners/Verifier、`security-requirements.md`のownership/integrityはContribution Rebuilder/Transaction、`scalability-requirements.md`のcontribution/write-setはPlanner/Transaction、`reliability-requirements.md`のphase semanticsはTransaction/Recovery、`tech-stack-decisions.md`の既存C1/C2/C4 stackは全component、`business-logic-model.md`のInspect/Compose/Drop/Doctor workflowは接続へ反映する。
