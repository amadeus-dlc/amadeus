# Reliability Design — reviewer-protocol

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。常駐service向けavailabilityではなく、review verdictの完全性、再現性、fail-closed性を設計する。

## Failure behavior matrix

| Failure | Required behavior | Blast radius |
|---|---|---|
| date command non-zero、空、複数行、不正形式 | Reviewを確定せずloud failure。推定値で補わない | 当該review invocation |
| checker personaまたは4 field欠落 | READY証拠として受理しない | 当該Review record |
| pass-list外read要求 | read前4条件が成立しなければfindingへ閉じ、追加read 0 | 当該scope decision |
| rejected後、decision前、approved path外、2 file目read | review全体を無効化 | 当該review iteration |
| owner 0件・複数、path不一致、reason空 | permissionを拡張せずcontract findingを返す | current Unit |
| projection drift | generator checkを非0にし、authored sourceを正とする | package/promote gate |
| repeated decision | 既存記録面で冪等に追跡し、増殖させない | 当該decision ID |

## Ordering・determinism

`reviewerReadScope`は同一UnitRef、passed consumes、実在artifact集合から同一closed pass-listを返す。spot-check decisionはreadより先にpath/reason/ID/owner evidenceを固定し、approved時の単一path追加はそのinvocationでのみ有効とする。

Review書込直前の単一`date -u +%Y-%m-%dT%H:%M:%SZ`出力と実checker personaを`runtimeReviewIdentity`へ渡し、Verdict、Reviewer、Date、Iterationを一つのrecordへ記録する。subagent result先頭にもchecker identityを示し、producer/checkerを混同しない。

## Observability・recovery境界

scope decisionは既存Review、subagent prompt/result、auditへ同値記録する。新event、metrics backend、trace collector、alert、retention、recovery journal、retry、circuit breaker、failoverを追加しない。missing optionalやunreferenced sibling contract entryをfalse findingへ変換しない。

## Verification design

identity/date、closed pass-list、positive/negative spot-check、review invalidation、projection drift、idempotencyをfixture化する。targeted testsとrepository gateを同一最終SHAで確認し、未実施、非0、stale結果をgreenへ読み替えない。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U08-01〜06、`security-requirements.md`のleast privilege、`performance-requirements.md`の単一実行、`scalability-requirements.md`の決定性、`tech-stack-decisions.md`の既存test/provenance、`business-logic-model.md`のFailure decisionsへ対応する。
