# Code Generation Plan — fix-1953-swarm-generation

上流入力(consumes 全数): requirements.md（FR-5）

- 対象 Issue: [#1953](https://github.com/amadeus-dlc/amadeus/issues/1953)（S3、fail-closed 側の欠落＝誤 pass 方向）
- 裁定: Q5=A（世代キー + legacy fail-closed）+ Q5b=A（bug 維持）— requirements-analysis で確定済み、設計判断の再開はしない
- Bolt branch: `bolt-fix-1953-swarm-generation`（base `origin/main`）
- 実装形態: conductor が worktree 分離で直接実装（本 unit は他 5 unit と異なり builder 未着手のまま park されていたため、
  再ディスパッチではなく conductor 実装として起票。`cid:code-generation:solo-bolt-worktree-required` に従い worktree 隔離）

## Steps（TDD、各スライス RED 実測 → 最小実装 → GREEN）

1. 計画世代の純関数 `boltDagGenerationOf` を追加する（コンパイル済み Bolt DAG の batch 構造の digest）。
   batch **順序**は同一性の一部、batch **内**の unit 順は復元元の表現差として非依存にする（FR-5a）。
2. 3 emitter（`SWARM_STARTED` / `SWARM_DEGRADED` / `SWARM_COMPLETED`）が `Plan generation` を刻む。
3. approve 側の突合は**現行世代の行のみ**を数える。世代不一致・世代欠落の行は fail-closed で受理しない（FR-5a / FR-5b）。
4. 拒否文に「別世代/無世代の行が存在する」事実と再突合手順を明示する（FR-5b の loud なエラーメッセージ）。
5. 受け入れ基準 FR-5d を逐語で固定する: stale 実績注入の approve が非0 exit、現行世代の実績は通過。
6. `Plan generation` を event registry の該当イベントへ登録する（初回軸で3件、再接地で
   `SWARM_UNIT_CONVERGED` を加えて**最終4件**）。
   **登録は装飾ではない**: `redaction.ts` の allow-list は registry の required+optional の union から導出され、
   未登録属性は append が成功報告したまま保存行から消える。emitter→registry→保存行の全経路をテストで固定する。

7. **FR-5c**: 本 Issue の対応要件を `260801-cg-plan-guard` の **FR-2**（`requirements.md:31-37`
   「stage approve 時の実績突合」）へ紐づけて記録する。FR-4 ではない根拠は、FR-2 の AC-2a/2b/2c が
   実績の**有無**のみを規定し**鮮度**を規定していないこと（本 Issue はその未規定面が生む誤受理）。
   記録先は Issue #1953 のコメント（実施済み: issue comment 5201098588）。

## 対象ファイル目録（設計確定後の導出）

- `packages/framework/core/tools/amadeus-lib.ts`（世代の純関数 + 復元ヘルパ、`SwarmEvidence` 型）
- `packages/framework/core/tools/amadeus-swarm.ts`（emitter の刻印）
- `packages/framework/core/tools/amadeus-orchestrate.ts`（収集時の世代フィルタ、拒否文）
- `packages/framework/core/otel/event-registry.ts`（optional 属性の登録）
- `packages/framework/core/knowledge/amadeus-shared/audit-format.md`（行の同期）
- `tests/integration/t402-approve-reconciliation.integration.test.ts`
- `tests/integration/t379-swarm-canonical-emit.test.ts`

## 実装中に発生した計画変更（上流の設計変更との衝突）

初回実装が CI 全緑・PR 発行済みの段階で、main に PR
[#2355](https://github.com/amadeus-dlc/amadeus/pull/2355)「CG approve の SWARM 実績突合を batch 番号から
Unit 名へ移し、再ディスパッチ由来の偽拒否を解消する」が着地し、**本 unit と同じ関数群の突合軸が変更**された
（衝突 13 hunk）。ユーザー裁定 A により、#2355 の Unit 名軸の上へ FR-5 を載せ直す方針を採用。

両者が排他でないことを実装時に確認した: #2355 は**偽拒否**（false negative）の解消、FR-5 は**stale 実績の誤受理**
（false positive）の封鎖であり、Unit 名軸でも replan で同名 unit が再登場すれば世代衝突は残る。
再実装時に `SWARM_UNIT_CONVERGED` が #2355 で証拠に格上げされていたため、**刻印対象を 4 イベントへ拡張**した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-06T06:18:08Z
- **Iteration:** 1
- **Scope decision:** none

FR-5c has zero recorded evidence, code-summary omits the stage-mandated Files created/modified record, and the 4-event stamping vs 3-event registry description is inconsistent.

### Findings

- BLOCKER | FR-5c (link this Issue's requirement to FR-2 of 260801-cg-plan-guard) has no plan step, no target artifact, and no mention in code-summary.md.
- BLOCKER | code-summary.md omits the stage-contract Files created/modified record, so the post-#2355 change surface is unverifiable from the record.
- BLOCKER | Registry coverage is described inconsistently: the artifacts say four events are stamped but the falsification describes removing three registrations.
- FOLLOW-UP | FR-5d acceptance is recorded as test pass counts, not as the approve invocation's non-zero exit named by the criterion.
- FOLLOW-UP | Degraded upstream inputs (unit-of-work absent under the fix scope) are not disclosed in either artifact.
- FOLLOW-UP | NFR-3 build-invariance evidence is missing for a change under packages/framework/core/.
- NIT | The claim that the t402 pin revisions were pre-declared by FR-5b overstates the upstream authorisation.

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-06T06:21:50Z
- **Iteration:** 2
- **Scope decision:** none

All three Iteration-1 BLOCKERs are resolved: FR-5c has plan Step 7 plus a recorded evidence pointer, code-summary carries the mandated 10-file Files created/modified table, and the 3-vs-4 registry description is reconciled as a 3-event cross-section with a measured 4-event final form.

### Findings

- FOLLOW-UP | FR-5d is measured at the in-process approve path rather than the criterion's named CLI non-zero exit; the limitation is disclosed, but close the mapping in build-and-test on the named path.
- FOLLOW-UP | FR-5e (SR-1 carrier-approve bypass) leaves an open decision on whether to file the separate Issue before intent close; it needs a ruling or the out-of-scope item silently disappears.
- FOLLOW-UP | The degraded-input disclosure appears only in code-summary.md; the stage asks it to be written in the plan and carried into the summary.
- FOLLOW-UP | The scope label self-fix is asserted in only one artifact and is not cross-checked against the directive record.
- NIT | The plan's file inventory lists 7 files while the merged surface is 10; the delta is explained in the summary but the plan was never annotated.
- NIT | Plan Step 2 still reads 3 emitter; the 4-event final form is reconciled only later in the plan.
- NIT | The FR-5c evidence is an external GitHub comment id, not quotable from the artefacts alone.
- NIT | The stage's test-configuration step is absent and the omission is not declared as a deliberate deviation.
