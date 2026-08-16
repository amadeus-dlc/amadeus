# Code Generation Plan — unit recommendation-core(U1)

## 拘束

- R-1 / ADR-1: 裁定結果は `unique` / `contested` / `none` の3種のみで表現する。第4の状態(「推奨なしだが進む」等)を型に追加しない。
- R-3: 外部表現からの復元は `parse` のみを入口とし、`Result<RecommendationOutcome, DecodeError>` を返す(project.md「Parse, Don't Validate」)。既定値補完をしない。
- R-8 / FR-4: history 段の競合(`uniqueOption` が `"conflict"`)は `contested` で終端する。`amadeus-intent-autonomy.ts:952` の次段への落下を廃止する。
- R-13 / ADR-1 Q2=B: ゲート導出器 `deriveGateRecommendation` は常に `unique("approve", basis)` を返す。contested/none を返す経路を持たない。
- R-6 / ADR-11: `RecommendationBasis.fingerprint` は本 unit では不透明な SHA-256 文字列として扱い、算出規則は code-generation への申し送り入力とする(本 unit のソースに算出実装を置かない)。〔事後注記 2026-08-16: この括弧書きの『本 unit』は C1 語彙モジュール(`amadeus-recommendation.ts`)を指すと確定 — E-260816-R6-FINGERPRINT 1-1 tie のユーザー裁定 B。導出段 C2(`amadeus-intent-autonomy.ts`)での算出実装は設計意図の実現。詳細と構造検査の実測は code-summary.md 申し送り節〕

## TDD 順序(実施順)

1. `amadeus-recommendation.ts` 新規: unique/contested/none の判別ユニオン + smart constructor + parse/serialize/presentationOf を先に実装し、`t3116-recommendation-outcome.test.ts` で pin(179行、コミット `2c3e32de1`)。
2. round-trip プロパティ(R-5)を fast-check で追加(`t3116-recommendation-outcome.pbt.test.ts`、コミット `ef2283a93`)。
3. 梯子とゲートの配線: `DecisionCapabilityPort.elect/recommend` の戻り型を `RecommendationOutcome` へ、escalate 枝、history conflict → contested 終端、`deriveGateRecommendation`、`humanReservedDecision?` seam を実装(コミット `73cd3729d`)。実装前に `t3116-recommendation-ladder.test.ts` の型検査 22 件が Red であることを `bun run typecheck` で実測してから着手。
4. 発火頻度の census(R-16/ADR-9): 機構起因クラス(phase-gate 106 + WS 66 = 172、§13 0件確認 79)の fixture 群で contested 発火 0 件であることを実データ由来の corpus(`tests/helpers/recommendation-decision-points.ts`)で pin(コミット `8336873c0`)。
5. AUTO_DECIDED の実測(R-7): ラダーの戻り値ではなく実コーディネータを駆動し committed transaction を読む形で「escalate は AUTO_DECIDED を1件もコミットしない」ことを検証(コミット `e2258fb45`)。

各段で落ちる実証(FP-1〜FP-3)は注入 → 赤の実測 → revert を1セットで実施し、`git status --short packages/` 空を機械確認した。

## 検証・配送

- swarm batch 1(recommendation-core / presence-detection / s13-zero / merge-provenance / grant-ceremony / d6-investigation を並行実装)。
- referee: batch 1 の統合コミット `a8ff18f52 integrate bolt-recommendation-core (batch 1)` で `swarm-int-rfc0001` へ収束。
- worktree: `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.amadeus/worktrees/bolt-recommendation-core`、branch `bolt-recommendation-core`、base `main@2eb94f1e3`。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T11:40:43Z
- **Iteration:** 1
- **Scope decision:** none

code-summary.md describes an ADR-11 fingerprint-digest function that contradicts the plan's own R-6 no-calc constraint and three design docs, with no reconciliation or required structural-check evidence.

### Findings

- BLOCKER | code-summary.md:16 vs code-generation-plan.md:9 | The plan's own 拘束 #5 states R-6/ADR-11 explicitly: fingerprint is opaque and 「本 unit のソースに算出実装を置かない」(no calc implementation in this unit's source). code-summary.md:16 then lists 「ADR-11 の正規形 digest `recommendationBasisFingerprint`」 as added to amadeus-intent-autonomy.ts — a file this same unit owns and edits. This directly contradicts the plan's constraint and is also inconsistent with business-rules.md:22 R-6, domain-entities.md:45/96, and security-design.md:6. code-summary.md's 検証(実測) table contains no structural-check entry proving R-6's required absence-of-calculation, and the 申し送り section (line 87) asserts 『逸脱: none』, which is unsubstantiated given this contradiction. Either the function is mislabeled or the constraint was silently violated — the artifacts do not resolve which, and no election/disposition record reconciles it.
- FOLLOW-UP | unit-of-work.md:7 vs code-summary.md | unit-of-work.md's U1 row lists `amadeus-bolt.ts`(decide-question 区画) as an owned source file for recommendation-core, but code-summary.md's implementation summary and commit list never mention amadeus-bolt.ts; none of the four reviewed unit artifacts explicitly announces or reconciles this drop from the canonical owned-files list.
- FOLLOW-UP | business-rules.md:61-62 (R-17) vs code-summary.md | R-17 requires contested-firing counts and decision-point classes be exposed as metrics-snapshot observation items re-derivable from a collection command's output. Neither plan nor summary describes such output/verification, and no note states this was deferred to another unit or is out of this unit's code-generation scope.

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T12:42:17Z
- **Iteration:** 2
- **Scope decision:** none

R-6 ruling B and its 3 in-scope grounds verified verbatim, structural check is a measured command+result+tree claim, both FOLLOW-UPs reconciled with citations; no new contradictions found.

### Findings

- FOLLOW-UP | business-rules.md:22-23 R-6 / domain-entities.md:45 / security-design.md:6 | These upstream FD/NFR docs still phrase R-6 with unqualified 「本 unit」(no C1/C2 disambiguation); the ruling's reconciliation lives only in code-summary.md's 申し送り and code-generation-plan.md's bracketed annotation, so a reader of the FD/NFR artifacts alone (without cross-referencing code-generation) would still see the pre-ruling wording that appears to prohibit fingerprint calc anywhere in the unit.
- NIT | unit-of-work.md U8 row vs code-summary.md:91 | code-summary.md attributes R-17's metrics-snapshot observation items to U8 completion-report (C9), but unit-of-work.md's U8 row text ('完了境界(complete-workflow経路)、amadeus-bolt.ts(list-auto-decisions 消費)') does not itself mention metrics-snapshot output — the attribution is plausible but not independently corroborated in the cited row.
