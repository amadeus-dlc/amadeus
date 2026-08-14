# Code Generation Plan — formal-election-multiq

## 実行条件

- **Depth:** Standard
- **Test Strategy:** Comprehensive
- **既存実装:** `FormalElection.tla` / `.cfg` / `FormalElectionCore.tla` と `model-map.json` の FormalElection 行は、すでに 2 question / 2 voter、I1–I8、Open / AcceptResponse / TallyQuestion / FinishRun / Rerun を持つ。再実装せず、rebase 後の identity 束縛と FR-FML-1 の反証証拠だけを閉じる。
- **対象:** `amadeus/spaces/default/specs/tla/FormalElection.tla`、`FormalElection.cfg`、`FormalElectionCore.tla`、`model-map.json` の FormalElection 行、FormalElection をピンする既存 test、および本 unit が追加する回帰。U7 以外の model / CLI / store は変更しない。
- **テスト設定:** 既存の Bun test 設定を継続利用し、新規設定ファイルは追加しない。
- **入力劣化:** user-stories は scope により SKIP。各 step は captured intent（#2813）と FR-FML-1、S8/S9 へ追跡する。

## 実装計画

- [x] **Step 1: rebase 後の identity と設計契約の差分確認**
  - `business-rules.md`、`domain-entities.md`、`security-design.md` と現行 FormalElection source / CFG / model-map / completeness を照合する。
  - 確認済みの一致: I1–I8 が CFG INVARIANT、有限 2q/2v、model-map vocabulary、completeness `pass:true`。
  - 確認対象のギャップ: formal-model-check の旧 TLC receipt は現行 FormalElection bytes と不一致。EstablishedImmutable / HeldOnlyTargets の mutant 反証が REAL TLC 面に無い。
  - **Trace:** U7、S8、FR-FML-1、NFR-4/5。

- [x] **Step 2: live identity の characterization を先行追加**
  - 現行 workspace の FormalElection module/cfg/aux/implementation identity が model-map と一致し、`loadVerifiedTlaSource` と completeness が成功することを固定する。
  - spec だけを改変した map は fail-closed のまま残す（既存 t380 を再実行し、本 unit では live pin を追加）。
  - **Trace:** FR-FML-1 AC2、Identity contract、NFR-4。

- [x] **Step 3: established / held-only の mutant 反証を追加**
  - REAL TLC が使えるとき、EstablishedImmutable を破る Rerun mutant と HeldOnlyTargets を破る Rerun mutant が COUNTEREXAMPLE になることを追加する。
  - 既存の PerQuestionIsolation mutant と production NOT_DETECTED 実行は維持する。
  - **Trace:** FR-FML-1 AC1、I5/I6、S8。

- [x] **Step 4: 現行 FormalElection に対する TLC 証拠**
  - `AMADEUS_RUN_REAL_TLC=1` で FormalElection の production composition を実行し、outcome `NOT_DETECTED`、partial=false、completion marker を記録する。
  - 旧 formal-model-check receipt は前 stage の履歴として残し、上書きしない。
  - **Trace:** U7 Delivers、NFR-5、Security Design。

- [x] **Step 5: U7 の検証**
  - focused unit/integration、typecheck、lint（対象 file）、source-only、`git diff --check` を実行し、exit code と結果を記録する。
  - Comprehensive 戦略のうち、適用 NFR に定量目標がない performance 境界は既存 skipIf を維持する。
  - repository-wide `test:ci` は記録するが、U7 外の既知失敗を本 unit の BLOCKER に転嫁しない。
  - **Trace:** NFR-5、U7 Delivers、Construction Testing Standards。

- [x] **Step 6: 成果物の閉包**
  - 全チェックボックスを実結果に合わせて閉じ、`code-summary.md` と `pr-convergence-report.md` に変更・検証・未検証面を記録する。
  - Intent state と commit は変更しない。
  - **Trace:** Code Generation stage completion contract。

## 非適用項目

- API/endpoint、DB migration、frontend、IaC、deployment artifact は U7 の in-place formal contract 境界に存在しないため非適用。
- production tally algorithm（U2）と CLI transition（U5）の再実装は所有外。
- 生成 mutant/temporary path を verified source として model-map に登録しない。
- U1 codec、U3 store、U6 migration、U8 skill/norm は所有外。

## トレーサビリティ

| Step | Story / Intent | Requirements |
|---|---|---|
| 1 | S8 差分確認 | FR-FML-1、I1–I8 |
| 2 | S9 identity 束縛 | FR-FML-1 AC2、NFR-4 |
| 3 | S8 established / held-only 反証 | FR-FML-1 AC1、I5/I6 |
| 4 | S8 TLC receipt | NFR-5、U7 Delivers |
| 5 | S9 検証証拠 | NFR-5 |
| 6 | stage 閉包 | code-generation produces |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T06:48:48Z
- **Iteration:** 1
- **Scope decision:** none

U7 plan, summary, and convergence report match the passed FormalElection contracts; live identity binding and established/held-only mutant evidence close FR-FML-1 without rewriting the spec. Remaining repository-wide CI is outside this unit.

### Findings

- FOLLOW-UP | repository-wide bun run test:ci was not re-run in this unit; NFR-5 full-gate evidence remains with U8 and Build/Test.
