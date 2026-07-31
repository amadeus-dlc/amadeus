# Election Record — E-OTELCG-S13

- question: 260729-otel-upstream code-generation ステージの §13 学習選定。候補1(採用案): 『gated swarm 経路の code-generation では、engine の per-unit 完了判定は record の unit 成果物(code-generation-plan.md / code-summary.md)実在で行われる — swarm worker は record を書かないため、batch merge 後に conductor が実績ベースで両成果物を作成しない限り next が同一 batch の invoke-swarm を再発出し続ける(approve-batch 記録後も同様)。conductor は finalize 後の定型手順として unit 成果物の事後作成を行う』(実測: 本セッション 2026-07-31 で batch 5 finalize+approve-batch 後も invoke-swarm が3回再発出 → 2 unit の成果物作成で run-stage gate:true へ遷移。cid:code-generation:degrade-scope-unit-dir-layout の swarm 経路面の補完)。他の作業中の学び(選挙 view の label 限定・ledger 流入・開票タイミング)は Issue #1772/#1773 として機構修正へ起票済みのため §13 対象外とした。選択肢: 候補1のみ採用 / 0件(候補1も不採用)。各自、実測根拠(本 intent の audit shard 終盤の SWARM_COMPLETED 後 next 挙動、construction/<unit>/code-generation/ の実在状態)を独立確認して投票せよ。

裁定: 候補1を採用(swarm 経路の unit 成果物事後作成を project.md へ persist)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): persist 文には機構の file:line 引用(unitCovered = packages/framework/core/tools/amadeus-orchestrate.ts:2787-2807 の existsSync による produces 実在検査のみ、firstUncoveredBatch :2590-2607 が同 batch の uncovered を再抽出、owedBatchGate :2620-2636 は approve 済み batch にゲートを課さない)を併記し、『swarm worker は record を書かない』は本 intent の実測範囲(batch 5)に限定して書くこと — batch 1-4 の unit 成果物には memory.md が同居しており(otlp-relay / legacy-writer-removal のみ memory.md 不在)、record 成果物が別経路で到達しうることを示すため、全 swarm 経路への一般化は未実証である。また『invoke-swarm が3回再発出』の回数は audit に next directive が記録されないため独立検証できず、回数は実測値としてでなく観測メモとして書くこと。
票タイムライン: 配信 2026-07-30T22:23:56Z → 配信 2026-07-30T22:23:56Z → subagent-1 2026-07-30T22:26:14Z(受理 2026-07-30T22:26:20Z) → subagent-2 2026-07-30T22:26:02Z(受理 2026-07-30T22:26:26Z) → 開票 2026-07-30T22:28:41Z
GoA[E-OTELCG-S13]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
