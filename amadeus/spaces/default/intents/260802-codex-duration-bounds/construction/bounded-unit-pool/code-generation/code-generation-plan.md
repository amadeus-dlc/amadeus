# Code Generation Plan — bounded-unit-pool

## 入力とトレーサビリティ

本計画は `unit-of-work.md` の Unit 4、`unit-of-work-story-map.md`、`requirements.md` の有界並列実行要件、同Unitの `functional-design`、`nfr-requirements`、`nfr-design` を入力とする。対象Issueは [#1919](https://github.com/amadeus-dlc/amadeus/issues/1919)。Test StrategyはComprehensiveである。

## 実施計画

- [x] **Step 1 — 多重度を階層設定として解決する**: `max-parallel-units` を project → space → intent の順で解決し、既定値とhard capを4に固定する。invocationは解決値を狭める場合だけ許可する。
- [x] **Step 2 — 固定Unitプールを共通coreへ実装する**: queued／active／terminal／drainingを持つ決定的な状態機械を追加し、依存関係、ready判定、FIFO、slot解放、終端結果を一元管理する。
- [x] **Step 3 — C2原子的永続化を行う**: Unit poolの状態遷移をcanonical audit Event Setとして検証後に一括appendし、失敗時に部分状態を残さない。
- [x] **Step 4 — dispatchの事実境界を閉じる**: permit取得とnative dispatch確認を分離し、native handleを伴う確認だけを開始事実とする。未確認dispatchはreconciliation結果に応じてtail requeueまたはdrainする。
- [x] **Step 5 — retryと失敗伝播を有界化する**: Unit試行予算とreconciliation予算を共有contractから消費し、局所失敗は推移的依存だけをcancelし、独立Unitは継続する。systemic uncertaintyでは新規dispatchを止める。
- [x] **Step 6 — swarm CLIを固定プールへ接続する**: prepare／acquire／confirm-dispatch／record-reconciliation／settle／terminate／late-result／finalizeを実装し、finalizeはterminal poolと成功Unitだけを受理する。
- [x] **Step 7 — directiveへ解決済みcapを運ぶ**: engineが `directive.cap` を発行し、全harnessのprepare例と固定プールprotocolが同じcapを明示的に渡すよう統一する。
- [x] **Step 8 — harnessをnative-fact-onlyへ制限する**: queue順、slot数、attempt数、retry admissionは共通coreだけが所有し、harnessはnative dispatchの受付・完了・reconciliation事実だけを報告する。
- [x] **Step 9 — audit・設定・配布物を同期する**: Unit poolのevent taxonomy、設定schema、directive、shared knowledge、7 harness package、self-install面を正本から生成する。
- [x] **Step 10 — Comprehensive test戦略を閉じる**: 既存のBun設定（`package.json` の `test:ci` と `bunfig.toml`）を再利用し、Unitは `t425-unit-pool.test.ts`、integrationは `t379-swarm-canonical-emit.test.ts` と `t425-unit-pool-harness-parity.integration.test.ts`、E2Eは `t134-swarm-referee.test.ts` で状態機械、CLI、harness parity、audit、worktree隔離、finalizeを検証する。新しいtest runner設定は不要である。
- [x] **Step 11 — 固定workloadをcontrol／treatment比較する**: 4独立Unit、各20msのfake worker、3 warmup＋20測定を `fixed-workload.ts` で再現し、#1919直前SHAのwhole-batch controlとcap=2 treatmentについてduration、attempt、maximum active、queue order、termination reasonを記録する。
- [x] **Step 12 — 隔離・機密情報境界を実証する**: 全harnessのworker起動指示へUnit worktreeと禁止git境界を固定し、refereeのworktree外path拒否とHEAD基準protected-file改変検知をE2Eで検証する。canonical queue eventにprompt／credential／raw outputのfieldが出ないことをUnit testと固定workloadで検証する。
- [x] **Step 13 — PR収束を完了する**: 最新mainへrebaseし、全review threadを解消し、full CI成功後に [PR #2071](https://github.com/amadeus-dlc/amadeus/pull/2071) をsquash mergeする。
- [x] **Step 14 — 取りこぼしたE2E契約を追補する**: merge後の `t134` で旧finalize直行fixtureが6件失敗するredを確認し、実運用と同じ `acquire → confirm-dispatch → settle-release → finalize` へ更新する。[PR #2075](https://github.com/amadeus-dlc/amadeus/pull/2075) で13件をGreen化し、full suite、coverage、review収束後にsquash mergeする。

## 非該当

Codex専用pool、harnessローカルcounter、whole-batch一括fan-outは追加しない。Codexは問題発見の契機だが、実装契約は全harness共通coreに置く。interaction budgetはUnit 3、Stop／swarm retryの予算原語はUnit 2、計測identityはUnit 1を再利用する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T22:44:28Z
- **Iteration:** 1
- **Scope decision:** none

共通coreによる固定Unit pool、harnessのnative-fact-only境界、原子的遷移、review・CI証跡は設計と概ね整合するが、承認済み要件とNFR設計に対する必須の実装・検証証跡がcode-generation成果物から欠落している。

### Findings

- Major | requirements.md FR-08.2、business-logic-model.md「Unit間接続と測定」、code-generation-plan.md Step 10、code-summary.md「テスト結果」「残課題」 | #1919は#1602と同じ固定workloadでcontrol／treatmentを比較し、duration、attempt、maximum active、queue order、termination reasonを報告する必要があるが、summaryには通常testとcoverage値しかなく比較結果がない。「製品実装上の残課題はない」とは判定できないため、固定workloadの入力・control SHA・treatment SHA・各測定値と結論を成果物へ記録すること。
- Major | security-design.md「Worktree Isolation」、requirements.md NFR-03／NFR-06、code-generation-plan.md、code-summary.md | WorkerLaunchSpecへのUnit worktree／禁止git境界の固定、protected path digest検証、queue eventからprompt／credential／raw outputを除外する設計について、計画上の実装step、変更ファイル、test証跡のいずれも示されていない。harnessをnative-fact-onlyにした説明だけではこのsecurity designを満たさないため、実装箇所と決定的testを追記するか、非実装なら残課題として明示すること。
- Major | code-generation.md Step 2、unit-of-work.md「Decomposition Contract」「Unit 4 Completion Evidence」、code-generation-plan.md Step 10、code-summary.md「テスト結果」 | Comprehensive戦略で必須のtest configurationとUnit／integration／E2E計画、およびUnit完了条件のTDD red/green証跡が計画・summaryで追跡できない。既存設定を再利用したなら対象設定と変更不要の根拠を、E2E相当をintegrationで満たすなら境界と対応testを、TDDについては失敗→成功の証跡を明記すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:07:45Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の3件はすべて解消され、固定workloadの再現条件・control/treatment SHA・要求指標が記録され、worktree隔離と機密field非出力が共通contractおよび決定的testへ接続され、Comprehensive戦略のUnit・integration・E2E・既存test設定・red→green証跡も追跡可能になったため、blocking findingはない。

### Findings

- None
