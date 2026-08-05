# formal-model-check advisory 実行記録(single-stage、2026-08-05)

上流入力(consumes 全数): 本記録は single-stage 実行の補助記録であり、consumes 宣言はない(stage frontmatter の consumes は空)。

- 契機: build-and-test 前の await-advisory-choice — `formal-model-check spec hash CHANGED (specs/tla)`(advisory_instance 8d3c9138-e3e9-4ee6-af99-e69e5c0c7f60、spec_identity sha256:60d8302c…)。変化の由来は並行 intent PR #2224 の specs/tla 更新の再接地取り込み(本 intent の変更ではない — git log 実測)
- 人間選択: 提示(DECISION_RECORDED)→ 実 HUMAN_TURN → `run-now` 記録(amadeus-advisory-choice record、human_turn 2026-08-05T22:21:37Z)
- 実行: `run-model-check-ci.ts run --root <worktree>` — Docker(eclipse-temurin:26-jdk digest 固定、network=none)+ tla2tools.jar(sha256 936a2620…)で実 TLC を各モデル warm-up 1 + measured 5 実行
- verdict(manifest 転記): **FormalElection: 5/5 NOT_DETECTED / exit 0**(TLC 実文「Model checking completed. No error has been found.」、3,414,566+ states generated / 211,059+ distinct)、**MirrorLifecycle: 5/5 NOT_DETECTED / exit 0**(111,814 states / 59,379 distinct)。completion-marker complete:true + 実統計あり — 有限探索完走の NOT_DETECTED 主張として接地(部分探索の丸め込みなし)
- `verify` 受理層は `{"exitCode":2,"reason":"ARTIFACT_VERIFY_FAILURE"}`(runtime receipt is incomplete)— ci-model-check-domain.ts:289-296 が githubRunId / githubRunAttempt を要求する GitHub Actions 専用受理のためローカルでは構造的非適用。TLC verdict とは独立(検査不成立ではない)
- センサー: model-completeness PASSED(2026-08-05T22:35:36Z)
- engine 記録: synthetic workflow `single-stage:formal-model-check` で committed(本線 Current Stage 不変)
- 実行残渣(FormalElection/ MirrorLifecycle/ の run dirs、未追跡)は verdict 転記後に削除
