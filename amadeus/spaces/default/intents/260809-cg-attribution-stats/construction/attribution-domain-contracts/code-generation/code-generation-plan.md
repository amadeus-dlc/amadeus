# Code Generation Plan — attribution-domain-contracts

## 方針

U-01 は既存 Stage Statistics CLI の下位に置く pure library である。`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、Functional Design 3成果物、NFR Design 2成果物を入力とし、filesystem、process、journal codec、renderer、generated surface を変更しない。Depth は Standard、Test Strategy は Comprehensive である。

## 実装チェックリスト

- [x] Step 1: `amadeus-stage-attribution-domain.ts` に closed vocabulary と相互代入不能な identity brand を定義する。
- [x] Step 2: `TargetStage`、`OutlierLimit`、`SecondInterval`、opaque identity の smart constructor と typed result/error を実装する。
- [x] Step 3: candidate、explicit lifecycle、window、contribution、disposition、population accounting の readonly public contract と constructor-level invariant を実装する。
- [x] Step 4: 17 rejection reason の固定 precedence と family/category の1対1 mappingを実装する。
- [x] Step 5: `t486-stage-attribution-domain.test.ts` に境界値、全 vocabulary、複合 finding permutation、invalid lifecycle/window/accounting、入力非破壊の focused unit test を実装する。
- [x] Step 6: 既存 Bun test configuration を再利用し、新規 configuration や dependency を追加しないことを確認する。
- [x] Step 7: focused test、repository typecheck、lint を実行し、source/test 2ファイルだけを Conventional Commit にする。

## 要件トレーサビリティ

| Step | 要件・設計契約 | 完了証拠 |
|---|---|---|
| 1、4 | FR-EVT-1〜5、FR-OUT-1〜4 | canonical tuple、derived union、family/category mapping、17理由 precedence |
| 2 | FR-POP-2、FR-INT-1、FR-CLI-1〜2 | stage/outlier/interval/identity constructor の table-driven test |
| 3 | FR-EVT-3〜5、FR-INT-1〜4、FR-STAT-1〜2 | explicit intent/stage transfer、window/accounting invariant test |
| 5 | FR-TEST-1 | `tests/unit/t486-stage-attribution-domain.test.ts` 14 test / 246 assertion |
| 1〜7 | NFR-2、NFR-3、NFR-6 | pure/sync/readonly、入力順非依存、typed fail-closed、acyclic leaf module |

U-01 は割当済み contract のみを実装する。Issue #2695 の FR 25件、NFR 7件、完了条件1〜10は U-01〜U-04 の全体 mappingを維持し、U-02〜U-04の責務を削減・先取りしない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T01:35:22Z
- **Iteration:** 1
- **Scope decision:** none

必須3成果物は必要なsectionと実質内容を備え、U-01のFunctional/NFR契約、所有source/test、pure leaf依存、FR-EVT-5、FR-TEST-1のU-01担当範囲を追跡できる。PR未作成はnot-applicable-yetかつconverged=falseとして明示され、PASSの代用にされていない。Issue #2695のFR 25件、NFR 7件、完了条件1〜10はU-02〜U-04およびBuild and Testへ保持されており、U-01へのscope縮小はない。受領済みcommit・test・typecheck・lint・swarm証拠とも矛盾せず、未解決BLOCKERはない。

### Findings

- FOLLOW-UP | code-generation-plan.mdの要件トレーサビリティはFR-EVT-1〜5、FR-OUT-1〜4、FR-TEST-1などUnit横断要件をU-01の完了証拠へ広く対応付けている。末尾のscope保持宣言とunit-of-work.mdにより早期完了扱いにはなっていないが、今後のcoverage ledger誤読を防ぐため、U-01は「supporting contract slice」、残責務はU-02〜U-04と明記するとよい。
- NIT | user storyがscope上未生成である一方、planは要件・設計契約へtraceしており、Code Generation stageが求めるfallback注記を明示していない。「user stories absentのためrequirements/unit contractへ代替traceした」と一文記録するとartifact形状がより厳密になる。
