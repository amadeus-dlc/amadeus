# Business Logic Model — unit completion-report

## 現状(reality-check)

- 完了境界の唯一の実装口は `completeWorkflowForTarget`(`packages/framework/core/tools/amadeus-state.ts:3230-3414`)。`operationWithLock` 配下で state を確定させ(`operationWriteState`、:3384)、最後に completion JSON を `console.log`(:3403-3412)する。この2点の間(:3384〜:3403)が本 unit の唯一の挿入余地。
- `AUTO_DECIDED` は `amadeus-intent-autonomy-runtime.ts:73,479,576` の3箇所で監査トランザクションのイベント種として発行され、各 intent の audit shard(record 配下)に committed 行として残る。
- 集計 API は `listProductionAutoDecisions`(`amadeus-autonomy-review-production.ts:302-316`)。`amadeus-bolt.ts:1071-1082`(`handleListAutoDecisions`)が CLI 面、`amadeus-bolt.ts:1334` の dispatch テーブルが subcommand 登録。ページング(`pageSize` 既定100、`DecisionCursor` によるカーソル)を持つため、完走集計には全ページ走査が要る。
- `DecisionSummary`(`amadeus-autonomy-review.ts:176-193`)は `decisionSource`(= `AutoDecisionRecord.decider`: deterministic-engine/solo-election/agent-recommendation)、`reviewState`、`grantId` 等の redaction 済みフィールドのみを持つ。`safeQuestion`/`safeBasisDigest` は redaction 対象で生の質問文は出ない場合がある。

## 処理フロー

```
completeWorkflowForTarget()
  ├─ (既存)state 確定 — operationWriteState(pd, content)
  ├─ [新規] buildAutoDecisionSummary(recordDir)
  │     ├─ listProductionAutoDecisions({ projectDir: pd, pageSize: N })を
  │     │   nextCursor が null になるまで反復呼出し、DecisionSummary[] を集約
  │     ├─ AUTO_DECIDED 監査行(audit shard)を record 断面から走査し、
  │     │   件数・basisKind(= AutoDecisionRecord.basisKind)別内訳を機械集計
  │     ├─ 突合: listProductionAutoDecisions の件数と AUTO_DECIDED 行数が
  │     │   一致しない場合(reviewState フィルタの副作用等)は不一致を
  │     │   summary 内に明記する(黙って片方を握りつぶさない)
  │     └─ Result<SummaryDoc, SummaryBuildError> を返す
  ├─ 成功 → <record>/completion/auto-decision-summary.md を書き込み、
  │         completion JSON の `auto_decision_summary` フィールドへ相対パスを載せる
  ├─ 失敗 → completion JSON の `auto_decision_summary_warning` フィールドへ
  │         理由を記録するのみ(error() を呼ばない — 完了は妨げない)
  └─ (既存)completion JSON を console.log
```

## 統合面

- 入力: U1(recommendation-core)が確定させる AUTO_DECIDED 発火条件(unique のみ emit)— unit-of-work-dependency.md の U8 blockedBy 記載どおり、U1 の梯子改修後に生成される AUTO_DECIDED 母集団を前提にする。本 unit 自体は U1 の型(`RecommendationOutcome`)を import しない(Q3 で確認済み)。
- 直列化: `amadeus-bolt.ts` の `list-auto-decisions` 消費部を読むのみで書き換えないため、U1/U6/U11 との「直列化のみ」制約(unit-of-work-dependency.md)は当 unit 側の変更が同ファイルの別区画(`amadeus-state.ts` の completion 経路)にとどまる限り Bolt 順序の制約として扱う。

## エラーパス(fail-closed semantics)

- `listProductionAutoDecisions` が `{ ok: false }` を返す場合(review-target 不在等)、summary 生成は失敗として扱い completion 自体は継続する(ADR-3 の non-blocking 契約)。
- record dir 解決不能(`recordDir` が null を返す legacy flat record 等)の場合も同様に warning へ落とし completion は止めない。
- 生成した markdown への書き込みが失敗(ディスクフル等)した場合も同様。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:28:56Z
- **Iteration:** 1
- **Scope decision:** none

completion-report は ADR-3 の非blocking契約・単一挿入点(state.ts:3230-3412)・basisKind 集計を忠実に守り、引用は全件実測一致。

### Findings

- FOLLOW-UP | unit-of-work.md owned-files | 実装点 amadeus-state.ts(completeWorkflowForTarget)の明示ファイル名が owned-files 列に不在 — code-generation 前に明示化すると grep 追跡が容易
