# Code Generation Plan — election-distribution-and-verification

## 実行条件

- **Depth:** Standard
- **Test Strategy:** Comprehensive
- **既存実装:** U1–U7 の public contract は揃っている。U8 は正本 skill / harness 投影 / 品質コマンド / always-elect norm を組み合わせ、生成面を直接編集しない。
- **対象:** canonical `amadeus-election` skill、対象 harness 投影の検証、FR 対応の integration/e2e/PBT/performance、`team.md` の `cid:requirements-analysis:always-elect`、旧 workaround 非再出現 scan、source-only / model-map / coverage を免除しない品質コマンド。generated `dist/` と self-install は build でのみ生成する。
- **テスト設定:** 既存の Bun test / package.json スクリプトを継続利用し、新規設定ファイルは追加しない。
- **入力劣化:** user-stories と NFR requirements は scope により SKIP。各 step は captured intent（#2813）と FR-OBS-2、FR-NORM-1/2、NFR-2/5、S9 へ追跡する。

## 実装計画

- [x] **Step 1: 正本 skill と投影ギャップの確認**
  - canonical `amadeus-election` skill が multi-question definition、responses、mixed result、hold-only rerun の directive loop を説明するか確認する。
  - 不足があれば core 正本だけを直し、`bun run build` で harness 投影を同期する。生成面は直接編集しない。
  - **Trace:** FR-OBS-2、S9。

- [x] **Step 2: always-elect norm を実装証拠の後に更新**
  - `team.md` `cid:requirements-analysis:always-elect` の「1選挙1質問」を、検証済みの multi-question definition、question 単位の回答、mixed result、hold-only rerun 契約へ更新する。
  - active memory の source scan で `E-SRA-RAS13` と `election-cli-canonical` が再出現しないことを確認する。Git 履歴の削除証拠だけを残す。
  - **Trace:** FR-NORM-1/2、S9。

- [x] **Step 3: 単問退行と mixed/rerun walking skeleton の証拠**
  - 既存単問回帰と、multi / mixed / hold-only rerun の walking skeleton を FR 対応表へ結ぶ。
  - NFR-2 の baseline/treatment 性能比較は、適用できる測定面があるときだけ実行する。未設定なら未検証面として記録する。
  - **Trace:** NFR-2、FR-OBS-2、S9。

- [x] **Step 4: 免除しない品質コマンド**
  - `bun run typecheck`、`bun run lint`、`bun run build`、`bun run source-only:check`、focused U8 tests、可能なら `bun run test:ci` を実行し、exit code と FR 対応表を記録する。
  - coverage / patch / isolated reproducible-build / model-map を免除しない。失敗が U8 所有外なら BLOCKER に転嫁せず未検証面へ書く。
  - **Trace:** NFR-5、U8 Delivers。

- [x] **Step 5: 成果物の閉包**
  - 全チェックボックスを実結果に合わせて閉じ、`code-summary.md` と `pr-convergence-report.md` に変更・検証・未検証面を記録する。
  - Intent state と commit は変更しない。
  - **Trace:** Code Generation stage completion contract。

## 非適用項目

- U1–U7 の domain rule / store / CLI / TLA+ 再実装は所有外。
- generated `dist/` と self-install surface の直接編集は禁止。
- 旧 bundled workaround の再導入は禁止。

## トレーサビリティ

| Step | Story / Intent | Requirements |
|---|---|---|
| 1 | S9 skill / projection | FR-OBS-2 |
| 2 | S9 norm / distillation | FR-NORM-1/2 |
| 3 | S9 単問退行 / mixed skeleton | NFR-2 |
| 4 | S9 品質コマンド | NFR-5 |
| 5 | stage 閉包 | code-generation produces |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T07:15:27Z
- **Iteration:** 1
- **Scope decision:** none

U8 plan, summary, and convergence report match the packaging contracts: skill vocabulary, harness projection via build, explicit-v2 CLI dispatch, and always-elect updated after t558 evidence. Remaining repo-wide CI and NFR-2 p95 are recorded as unverified, not blockers.

### Findings

- FOLLOW-UP | repository-wide bun run test:ci and NFR-2 30-run p95 were not executed in this unit; leftover quality/perf evidence remains with Build-and-Test.
