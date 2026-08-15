# Formal Model Check — Outcome: NOT_DETECTED(全 4 モデル)

- 実施: 2026-08-15(single-run — advisory run-now handoff、intent 260814-open-bug-batch-6)
- 実行: `bun .claude/plugins/formal-model-check/tools/run-model-check.ts --model <M>.tla --cfg <M>.cfg --out <out>` を登録 4 モデルへ逐次適用
- 結果(いずれも exit 0 / outcome NOT_DETECTED / counterexampleIdentity null):
  - BoltPrAttestationGate — runId 71432dc2-0dba-40c1-86b2-1896009adeea
  - FormalElection — runId d559186d-ed8e-426d-978d-8031db743129
  - MirrorLifecycle — runId ea5e3060-836b-48f7-bece-af5d30bb9468
  - PrConvergenceGate — runId 795afab5-a2e0-4e94-ba96-dfa26255526a
- 証跡: 各モデルの run 出力 JSON を本ディレクトリ配下 `<Model>/` に同梱
- 申し送り(誤経路の記録): 最初の試行は CI 変種 `run-model-check-ci.ts run` をローカル実行し、TLC 24 run 全 exit 0 にもかかわらず CI 専用 runtime receipt 検証(GITHUB_RUN_ID 等必須)で exit 2 / ARTIFACT_VERIFY_FAILURE。ローカルは `run-model-check.ts`(単モデル×--out)が正規経路。誤経路の transcript は `ci-harness-attempt-*.json` に保存。CI 変種は evidence root 既定が cwd のため repo 直下へ生成物を撒く(autonomy-refactor 汚染と同族 — 掃除対象)
