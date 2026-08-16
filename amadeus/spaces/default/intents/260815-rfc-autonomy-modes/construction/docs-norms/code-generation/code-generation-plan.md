# Code Generation Plan — unit docs-norms(FR-14 / Q16 / U12)

## 拘束

- R-1(FR-14): stage-protocol.mdの記述は実装挙動と一致すること — mode別マトリクス(none/semi/full × 確認ポイント)での照合を検査とする。
- R-2(Q16): ノルム3レイヤーの改定は本intentの変更列に含める(改定案のrecord起草)。ノルムPR自体はteam.md persist規律に従い単独ブランチとする — 本unitでノルムファイルを直接書き換えない。
- R-4(P2): 文書は実装から導出し、未実装の挙動を先行記述しない(先行記述は検証劇場の文書版)。
- FDレビュー(Iteration 1、READY): mode別マトリクスの突合責任分界がdomain-entities.mdで薄いとのNIT — code-generation段で明確化を推奨されていた。

## TDD 順序(実施順、base `swarm-int-rfc0001@040196a11`、全12実装unit統合済み)

1. `bun install`/`bun run build`を実装前に完走。
2. 実装からの導出(起草時に実読、file:line): `SEMI_HUMAN_MILESTONES`(`amadeus-intent-autonomy.ts:735`)、`SEMI_ROUTINE_INTERACTIONS`の補集合導出(`:739-741`)、`ALL_INTERACTION_KINDS`(`:107-112`)、`SemiAuthority.allowsOccurrence`第3項(`:800-805`)、`projectConstructionAutonomy`(`:56-58`)、`nonAutoDecidedKinds`/`autoDecidedKinds`(`-production.ts:97-108`)、裁定順序1/3(`:1154,1163`/`:1185,1194,1206`)、waiting(`amadeus-intent-autonomy.ts:119`、`amadeus-waiting.ts`)、`resolveSessionInteractivity`(`:143-155`)、WS stance従属(`-production.ts:119-133,238-247`)、park mode arm撤去(`amadeus-state.ts:1577-1588`)、Stop hook carveout(`hooks/amadeus-stop.ts:501-526`/`:552-590`)、継続上限(`:154-161`)、`deriveSoloElectionTrigger`(`amadeus-config.ts:82-84`)、consent軸キー(`:585,603`)、廃止キーloud fail(`:666-690`)、advisory効果分類(`amadeus-intent-autonomy.ts:662-669`/`amadeus-advisory-choice.ts:302-305`)、advisory無人解決run-now限定(`:382-393`)、swarm batch presence(`amadeus-bolt.ts:1252-1253`、`amadeus-lib.ts:3964`)、gate presence fail-closed(`:3878-3882`)、merge記録(`amadeus-merge-provenance.ts:1-11`)。
3. mode×checkpointマトリクス20点をfile:line根拠付きで起草(`construction/docs-norms/mode-matrix.md`)。
4. `t3116-docs-mode-matrix.test.ts`(19テスト)で機械照合面(fenced YAML `checks:`)と散文表の両面をクロスチェック。落ちる実証(R-1): 注入1(YAML1セル反転)→2件fail、注入2(散文表1セル反転、鏡像方向)→1件fail、いずれもrevertで19 pass。
5. stage-protocol.md / conductor.md / SKILL.md群 / glossary / 03-orchestrator / 04-stages / 08-construction-and-swarmの実装導出同期(全12unitの実装から書き起こし、未実装の先行記述をしない)。
6. RFC-0001 frontmatterへtracking-issue #3116を記入。ノルム改定案は`construction/docs-norms/norm-revision-drafts.md`へ起草のみ(record内)、ノルムファイル自体は変更しない(R-2)。
7. `bun test tests/unit`完走で継承済みの赤2件(`t-formal-verif-tlc-toolchain.test.ts`のSOURCE_DRIFT、`complexity-gate.test.ts`)を発見 — 帰属実測(下記「申し送り」参照)により本unit起因でないと確定、修正はconductor側の作業として明示し着手せず。

## 検証・配送

- swarm batch 5(docs-norms単独、他11 implementation unit全統合後の最終unit)。
- referee: `fc1d16e15 integrate bolt-docs-norms (batch 5)` で `swarm-int-rfc0001` へ収束。base `040196a11`(全12実装unit統合断面)。
- worktree: `.amadeus/worktrees/bolt-docs-norms`、branch `bolt-docs-norms`、HEAD `2149d92b4`。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T12:38:34Z
- **Iteration:** 1
- **Scope decision:** none

docs-norms artifacts trace cleanly to FR-14/R-1..R-4, TDD falling-proof for the mode-matrix cross-check is documented, R-2 (draft-only, no direct norm edits) is honored, no unannounced deviations found.

### Findings

- FOLLOW-UP | pr-convergence-report.md:3,33-35 | kind: converged is recorded for a PR whose local/remote/pr head all equal the already-merged head 29fcba31d; per the team's post-#3113 convention (cid:pr-convergence:c1-2, project.md Learnings Inbox) a MERGED PR's authoritative report should be minted via the merged arm as kind: landed (bound to merge commit SHA/mergedAt). Context attests this converged copy is the intentionally-recovered authoritative record artifact, so not blocking, but a landed-kind regeneration would bring this unit's produced artifact in line with the current CLI convention.
- FOLLOW-UP | code-summary.md:16 | Enumerates the election SKILL sync as 'SKILL.md ほかharness別6ファイル' (6 harness-specific files), which does not numerically match the conductor-attested 'all 8 harness projections' for protocol/conductor/election-SKILL sources — the summary's harness-fan-out count should be reconciled/made explicit for full traceability.
- NIT | unit-of-work.md:18 (U12 ~150-line estimate) | Actual docs-norms diff (mode-matrix.md 113 lines + t3116 test 184 lines + norm-revision-drafts.md 126 lines + several bilingual doc-pair edits) substantially exceeds the inception-time estimate; code-summary.md does not note or reconcile this overrun, useful feedback for future units-generation sizing.
- NIT | domain-entities.md:3 | Describes the mode×checkpoint matrix as a 'build-and-testの検証成果物' (build-and-test-stage deliverable), but it was actually authored with its own TDD red→green cycle inside this code-generation unit (t3116) — a minor stage-attribution wording mismatch between the FD artifact and where the artifact actually landed; no functional impact.
