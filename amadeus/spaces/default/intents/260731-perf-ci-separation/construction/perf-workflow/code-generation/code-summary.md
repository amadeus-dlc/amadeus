# Code Summary — U2 perf-workflow

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U2 FD)、code-generation-plan.md

実装 branch: `bolt-perf-workflow`(PR #1851、マージ着地 cb452fd2f)。コミット: de8ec1646(perf.yml 新設 +155行)/ 8b7022f9a(レビュー対応: persist-credentials:false + benchmark 失敗サマリー)。

## 実装内容

- perf.yml: cron 47 17 * * * + workflow_dispatch(BR-U2-1)、concurrency perf、contents:read、jobs 3 面(perf-tests timeout 25 / benchmark ×3 timeout 5 / aggregate timeout 5 — domain-entities.md のエンティティ表どおり)、全 job failure() STEP_SUMMARY(BR-U2-4)、test-size-report + benchmark artifact(BR-U2-7、名前は ci.yml と同一)
- ヘッダ文書化3点(非 blocking 契約 / CI-residency 意味論 / schedule 60日 suspend — BR-U2-8)
- 意図的差分(申告済み): lizard 非移植 / changes フィルタ非移植(daily 全量)/ 失敗サマリー追加 / pipefail+stderr 分離 / persist-credentials:false(新設面のみの硬化)

## 検証

静的: yaml parse 0 / timeout 3宣言 / cron 実文一致 / ci.yml diff 空 / typecheck 0 / lint 0 / dist:check 0(builder 報告+conductor 再実測)。swarm referee check/finalize converged。
動的(AC-2): マージ後 dispatch run 30644685248 全 job success — perf-tests 1.5分 / benchmark 0.2-0.3分 ×3 / aggregate 0.2分(2026-08-01 実測、PR コメントに記録)。
