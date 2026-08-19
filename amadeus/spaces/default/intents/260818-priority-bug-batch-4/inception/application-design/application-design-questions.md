# Application Design — Design Questions

Intent: 260818-priority-bug-batch-4(#2837 + #3106、depth Minimal)

> 両問とも「複数の妥当解」を持つ設計方式選定であり、requirements.md(FR-2837-1 / FR-3106-1)が選挙裁定を明記する(承認済み)。ソロ選挙(fresh subagent 2名、blind 配布、amadeus-election CLI 指令ループ)で裁定し、結果を各 [Answer] に E-code 付きで記録する。conductor は投票しない。

## Q1: #2837 — invoke-swarm 実行コンテキストの契約形

新規 batch arm の invoke-swarm で conductor が推測なしに prepare/check/finalize を実行できる契約にする。全案共通の制約(requirements 確定済み): batch identity は pool generation を織り込む(素の 1-origin DAG index は failed terminal 後の再提示で同番号が返り pool 衝突を再現する — reviewer-2 再現6)、既存 `prepared_batch` / `retry_unit` arm と整合(C15)、engine 正本 + 7 conductor 面同期(FR-2837-3)、回帰テスト(FR-2837-4)。

- A. directive フィールド拡張 — invoke-swarm に batch identity(pool generation 織り込み)と check context(check_cmd、任意 test_file)を載せる(起票者推奨)
- B. read-only context verb 新設 — directive は現行最小形のまま、`amadeus-swarm context` 等の read-only verb が batch/pool identity + check context を一意に返し、conductor 面に正確な呼び出し順を記載
- C. ハイブリッド — dispatch に不可欠な batch/pool identity のみ directive へ載せ、check_cmd / test_file は conductor 知識として正規取得元(取得手順)を conductor 面へ明記(engine は供給しない)
- X. Other (please specify)

[Answer]: C — 選挙 E-260818-PBB4-FIX-METHODS q1-2837-context-contract established(2-0、GoA 2/2、tally run-1 2026-08-18T08:18:13Z)。両票留保は実装契約として decisions.md ADR-1 へ転記

## Q2: #3106 — per-unit 経路 cancelled / failed unit の terminal outcome 記録方式

per-unit 経路の cancelled(SR1 により failed も同一裁定対象)unit に terminal outcome を可視化し、`producer-outcome-pending` 構造停止を解消する。全案共通の制約: pool 経路との対称性(FR-3106-3 — consumer を止めず paths は emit しない)、failed は診断 `producer-outcome-failed` を返す(設計意図 orchestrate.ts:4127-4128 の回復)、落ちる実証(FR-3106-2)、E-260815-3099 系裁定(`Outcome: succeeded` 限定)との関係整理を design 成果物に記録。

- A. settle emitter の語彙拡張 — `settlePerUnitOutcomes` が cancelled / failed も `UNIT_OUTCOME_SETTLED` 行として記録し、`SETTLED_UNIT_OUTCOME` の単一値を閉集合 {succeeded, cancelled, failed} へ拡張(reader :2499 の受理拡張を含む)
- B. 母集団読み口の統一 — `readPerUnitConsumePopulation` が検出側と同じ canonical construction outcome projection(solo `BOLT_COMPLETED` terminal を含む)を読む(audit 新行なし、2 読み口の可視性不一致を根で解消)
- C. 発生点で pool event 発行 — solo skip/fail arm が pool coordinator 相当の terminal event を書き、outcome 台帳を pool 経路へ一本化
- X. Other (please specify)

[Answer]: A — 選挙 E-260818-PBB4-FIX-METHODS q2-3106-outcome-recording established(2-0、GoA 2/2、同 tally)。両票留保(failed arm の到達可能 Red 条件を含む)は decisions.md ADR-2 へ転記
