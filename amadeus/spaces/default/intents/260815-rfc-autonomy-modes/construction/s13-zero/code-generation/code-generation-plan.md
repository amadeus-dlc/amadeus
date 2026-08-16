# Code Generation Plan — unit s13-zero

## 拘束

- R-1(FR-11・ADR-6): 0件確定の唯一の根拠は`amadeus-learnings surface`出力に束縛されたdigestとする。conductorの自己申告(散文のみの主張)を根拠にしない。
- R-2(ADR-6): `confirmZeroCandidates`は`candidates.length === 0`かつsurface実行結果由来のdigestが一致する場合にのみ`ZeroReceipt`を発行する。
- R-3(ADR-6): `addConductorCandidate`は候補集合を増やす方向のみ操作可能 — 既存候補の削除・書換を提供しない。
- R-4(ADR-6): 追加候補はdisk上の記録(`diskEvidencePath`)から再導出可能であることを要件とし、パス不在・内容不一致はfail-closedで拒否する。

## TDD 順序(実施順)

1. 不在確認: `t-learnings-s13-zero-seam.test.ts`を実行 → Red(`confirmZeroCandidates`export不在、exit 1)。business-rules.mdの「機械的な0件確定手段が存在しない」Red期待を確認。
2. `amadeus-learnings.ts`(+221行)に`confirmZeroCandidates`/`addConductorCandidate`を実装。設計上のFDが明示的に開いた自由度内の判断:
   - `confirmZeroCandidates`: domain-entities.mdの2アーム型`ZeroReceipt|NotZero`をそのまま採用。digest不一致+候補0件のケースはNotZero{candidateCount:0}へ(FDが3アーム目を明示的に実装者裁量としていたため)。
   - `addConductorCandidate(candidate, diskEvidencePath)`: component-methods.md C10の2引数シグネチャどおり、既存候補配列を受け取らない。追加分のみを返す(マージはconductorの orchestration層の責務、business-logic-model.mdが明記)。
   - Evidence対応検査: evidenceファイル内容が`candidate.summary`を含むかの部分文字列検査(機械検査可能な最小形)。
   - `surfaceDigest`: sha256(JSON.stringify(正規化candidates+parked)).slice(0,16)、`amadeus-learnings.ts`内に閉じる(`amadeus-lib.ts`は触らない)。
3. 監査: `LEARNING_ZERO_CONFIRMED`/`LEARNING_CANDIDATE_ADDED`をcategory `"learning"`で新規登録(Q4の明示的申し送り + swarm-brief rule #2の明示的許可)。event-registry.ts(93→95)、amadeus-audit.ts、audit-format.md、t28/event-registry-drift.testのcount pin。

## 検証・配送

- swarm batch 1(recommendation-core / presence-detection / s13-zero / merge-provenance / grant-ceremony / d6-investigation)。
- referee: `3e9bb386f integrate bolt-s13-zero (batch 1)` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-s13-zero`、base `main`。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T11:45:55Z
- **Iteration:** 1
- **Scope decision:** none

s13-zero code-gen traces cleanly to FR-11/ADR-6/R-1..R-6; plan lacks checkbox format and summary omits Green/typecheck evidence — FOLLOW-UP only, not blocking.

### Findings

- FOLLOW-UP | code-generation-plan.md uses unlabelled numbered lists under "拘束"/"TDD 順序" with no [ ] checkboxes anywhere, contrary to the stage contract's Step 2 requirement ("with checkboxes for each implementation step", "Number each plan step sequentially (Step 1, Step 2, etc.)"); reduces machine/human traceability of completion status even though the plan content itself is sound.
- FOLLOW-UP | code-summary.md §検証(実測) and §申し送り self-disclose that typecheck/lint/build exit codes and the post-implementation Green pass count were never transcribed — only the pre-implementation Red run for `confirmZeroCandidates` is recorded verbatim. The TDD-mandatory norm (project.md cid:code-generation:tdd-default-with-narrow-exceptions) expects both halves of the Red→Green vertical slice to be measured and recorded; the merged PR + `converged: true` report imply CI eventually passed, but this artifact carries no Green evidence of its own.
- NIT | code-generation-plan.md (step 3) cites "swarm-brief rule #2" as explicit authorization to extend shared files (event-registry.ts, amadeus-audit.ts, audit-format.md) outside U9's declared owned-files column (unit-of-work.md U9 lists only amadeus-learnings.ts), and both business-logic-model.md/domain-entities.md/code-generation-plan.md cite "component-methods.md C10" for the addConductorCandidate signature — neither source is in this review's scope so the citations could not be verified independently; recommend a future pass include these paths.
- NIT | unit-of-work.md U9 estimate is ~100 lines but code-summary.md reports the amadeus-learnings.ts change alone at +221 lines, more than double the whole-unit estimate before counting event-registry.ts(+29)/amadeus-audit.ts(+8)/docs/tests — justified by the FD-mandated audit trail (R-5) but worth an estimate-calibration note for future units of this shape.
