# Functional Design — Questions(unit completion-report)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: レポート生成のフック位置

- A. `completeWorkflowForTarget`(`amadeus-state.ts:3230`)内、state 確定(`operationWriteState` 実行後 :3384)から完了 JSON 出力(:3403-3412)までの間に生成する。生成失敗は completion JSON の warning フィールドへ格納し `error()` を呼ばない(non-blocking)
- X. Other

[Answer]: A — ADR-3「非 blocking(生成失敗は警告、完了は妨げない)」。state 確定より前だと未確定の completion を前提にした要約になり、JSON 出力より後だと実行順序が保証されない(プロセス終了と競合しうる)ため、確定後・出力前が唯一の非破壊な挿入点。

## Q2: 集計データソースの確定

- A. AUTO_DECIDED 監査行(record の audit shard に committed 済みの行、`amadeus-intent-autonomy-runtime.ts:73` 型 `{ type: "AUTO_DECIDED"; decision: AutoDecisionRecord }` が実際に書く行)を件数・basisKind 別集計の一次ソースとし、`listProductionAutoDecisions`(`amadeus-autonomy-review-production.ts:302`、`amadeus-bolt.ts:1334` の `list-auto-decisions` dispatch と同一関数)を reviewState 別内訳(not-applicable/unreviewed/accepted/flagged)の取得に使う。両者は同一 intent の同一 AUTO_DECIDED 系列を異なる投影(生ログ vs レビュー射影)で読むだけで、二重正本にはならない
- X. Other

[Answer]: A — ADR-3 逐語「AUTO_DECIDED 監査レコード + 既存 list-auto-decisions からの機械生成のみ」。LLM 計数・散文の混入禁止(P2)なので、両方とも disk/API からの機械集計であることが条件。

## Q3: RecommendationOutcome 種別の集計への反映

- A. U1(recommendation-core)が AUTO_DECIDED 記録の `basisKind` に新たな種別を持ち込まないため(`decisionRecord()` の `basisKind` 列挙は無改変)、レポートは既存の `basisKind`(confirmed-policy / norm / history / solo-election / agent-recommendation)別件数で構成する。`RecommendationOutcome` の `unique/contested/none` は AUTO_DECIDED を emit するかどうかの分岐(unique のみ emit — C2 の契約)であり、emit された行の集計に kind 軸は不要
- X. Other

[Answer]: A — unit-of-work-dependency.md の「U8 completion-report | U1(AUTO_DECIDED の新 outcome 種を集計対象に含む)」は AUTO_DECIDED が発火する母集団が RecommendationOutcome の縮退除去(D4)により変わりうることを指すのみで、レコード自体のスキーマ(component-methods.md C2)に kind フィールドの追加はない。component-methods.md C1/C2 のシグネチャに矛盾がないことを確認済み。

## Q4: レポートの配置パスと様式

- A. `<record>/completion/auto-decision-summary.md`(record 直下の新規サブディレクトリ — stage 所有物ではないため既存 phase ディレクトリを流用しない。`goal/`・`verification/` と同格の record-root サブディレクトリ前例に倣う)。内容は AUTO_DECIDED 件数・basisKind 別内訳・reviewState 別内訳の表 + 生成に使った record 断面(record dir・生成時刻)の機械記述のみ
- X. Other

[Answer]: A — ADR-3「record へ書き完了メッセージに提示」。stage 所有ディレクトリ(`<record>/<phase>/<stage>/`)は特定 stage の成果物専用であり、完了境界は特定 stage に属さないため record-root 配置が唯一整合する。
