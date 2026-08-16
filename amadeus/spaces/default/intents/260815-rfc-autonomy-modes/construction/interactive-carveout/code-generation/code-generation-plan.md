# Code Generation Plan — unit interactive-carveout(U4 / ADR-5 / FR-4 / Q11=A)

## 拘束

- R-1: Stop hook の対話/非対話判定は C3 の `resolveSessionInteractivity` のみを読み、hook 内に第2の判定を実装しない。
- R-4: carveout 2(pending-question)/ 3(pending-compose)の mode/grant 根拠の拒否(`isQuestionCarveoutIntent` :450、`isFullyAutonomousIntent` :485)を撤去する。carveout 1(human-wait)・4(conversational)へは新束縛を課さない(適用範囲は2/3のみ)。
- R-5 / R-6: 対話セッションでは裁定順序3到達(contested/none)または裁定順序1(人間専権)の裁定点でのみ carveout 2/3 が発火する。終端が unique(自動裁定可)では発火させない(ADR-9 発火頻度予算)。
- R-11 / R-12: carveout 1(human-wait)・4(conversational)は現行意味論を完全保存する無退行 pin を対で置く。

## TDD 順序(実施順、base `swarm-int-rfc0001@b69be09db`)

1. seam 解決: FD が「読取口は `readProductionAutonomyProjection` ただ1つ」と定めつつ具体エンベロープを U1/U3 の申し送り入力としていた点を、U1/U3 が実際に着地させた形(`readProductionWaitingStop` が `cause.outcome.kind ∈ {contested, none}` を返す)で解決 — 新規 engine call を追加しない純粋なディスク読取であることを確認してから採用。
2. `t561-interactive-carveout.integration.test.ts` を先に作成(FP-1〜FP-5、5ケース)。
3. Red 実測(9 pass / 5 fail、base `b69be09db` + テストファイルのみ)。
4. `amadeus-stop.ts` の質問/compose carveout を interactivity port + ruling-order terminal の2軸へ実装。
5. Green 実測(14 pass / 0 fail)。
6. R-11/R-12 の無退行 pin を対で確認(human-wait/conversational は改修前後で同一結果)。
7. `isQuestionCarveoutIntent` 削除に伴うテストの棚卸し: `t456-question-carveout-predicate.test.ts`(200行、対象predicate丸ごと削除)を削除し、t121/t195/t246/t481 の参照を retarget。t122 の park アサーションは U3 の park-guard 撤去で統合base時点で既に赤だったものをここで修復。

## 検証・配送

- swarm batch 3(interactive-carveout / semi-authority-projection)。
- referee: `548f09f5a integrate bolt-interactive-carveout (batch 3)` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-interactive-carveout`、branch `bolt-interactive-carveout`、base `swarm-int-rfc0001@b69be09db`、HEAD `d32546f8e`。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T12:13:50Z
- **Iteration:** 1
- **Scope decision:** none

Plan/summary/report agree on unit, commits, and PR (known pre-merge kind:converged lag aside); scope stays surgical to hooks/amadeus-stop.ts; falling-proof counts are arithmetically consistent; a few traceability/process gaps noted as FOLLOW-UP, none rising to blocking.

### Findings

- FOLLOW-UP | code-generation-plan.md 'seam 解決' + code-summary.md 実装 summary vs business-logic-model.md §改修後のフロー2 and domain-entities.md §借りる型 | Both consumed design artifacts state the ruling-order terminal's sole read point is `readProductionAutonomyProjection` ('ただ1つ', engine call not to be introduced), but the shipped code reportedly reads via a different named function `readProductionWaitingStop` (returning `cause.outcome.kind`). code-summary.md's 申し送り labels this 'not a deviation, within freedom the FD explicitly opened' — a unilateral applicability judgment team.md P3 says isn't for a single agent to decide ('既存様式への準拠と判断する場合も該当性を単独で決めない'). The plan does record that it verified no new engine call was added, which mitigates risk, but the two upstream design docs now name a function that doesn't match what was implemented. Recommend reconciling business-logic-model.md/domain-entities.md to name the actual accessor (or confirm it wraps readProductionAutonomyProjection) so design docs stay current with what shipped.
- FOLLOW-UP | code-summary.md 申し送り | Discloses that `WaitingCause.interactivityBasis.interactive` is hardcoded `false` at amadeus-waiting.ts:34, so the interactive-session escalate-terminal writer carveout 2's dialogue arm depends on does not yet exist — that arm is inert in production even though this unit's hook logic is complete and unit-tested via fixtures. Confirm this cross-unit gap is tracked against U1/U3's own code-generation so FR-4's interactive-full acceptance criterion gets exercised end-to-end (not only via in-process fixtures) before intent completion.
- NIT | business-rules.md §検証上の注意 vs code-summary.md file/commit list | business-rules.md requires a `tests/.coverage-registry.json` regen alongside the new t561 test file (project.md cid:build-and-test:c1), but code-summary.md's Files/Commits sections don't itemize this housekeeping step. pr-convergence-report.md's converged:true / mergeStateStatus CLEAN suggests CI's freshness check passed, so likely done but undocumented in the summary.
- NIT | code-generation-plan.md format vs code-generation.md Step 2 | Plan uses a compact 'TDD 順序' numbered list (1-7) instead of the stage's recommended checkbox (`- [ ]`) / 'Step N' / traceability-table structure; substance is present via R-1/R-4/R-5/R-6/R-11/R-12 citations and the header naming U4/ADR-5/FR-4/Q11, so this is a formatting compactness note rather than a comprehension gap for an implementer.
