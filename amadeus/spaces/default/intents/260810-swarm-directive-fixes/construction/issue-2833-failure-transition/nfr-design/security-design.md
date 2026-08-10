# Security Design — issue-2833-failure-transition

入力: [`business-logic-model.md`](../functional-design/business-logic-model.md)。NFR Requirementsはself-feature scopeでexpected skipのため、宣言済みSEC identifierは存在しない。

## Trust Boundary and Validation

canonical audit recordはworkspace内の一次証拠だが、projection入力としては信頼済みと仮定しない。`business-logic-model.md:5-13`のjoin前にevent shapeとintent / stage / unit / attempt / batchを検証し、欠落・曖昧・矛盾は診断付き`ProjectionResult.ok=false`へ閉じる。既定値によるidentity補完、別intent/stage evidenceの混入、部分projectionの利用を禁止する。

event identity dedupeとcanonical sequence比較は入力の意味的整合性を守るためのvalidationであり、認証や暗号化を新設しない。CLIは既存workspace権限内だけで同期実行し、network、credential、secret、外部serviceを追加しない。

## Authorization and Least Authority

projection componentは正規化済みrecord列を受け取るpure readerで、filesystem書込、worktree cleanup、state checkbox変更を持たない。selector adapterだけが既存engine directiveを選ぶが、generic park guard、Stop hook、autonomy grantを変更しない（`business-logic-model.md:35-43`）。

Retry / Skip / Abortはいずれも既存audit writerとengine-owned transitionを使い、対象外Unitのoutcomeや証拠を削除する権限を与えない。Abortは`parked`を返すだけでstage完了を記録しない。

## Audit Integrity and Error Disclosure

- terminal outcomeと裁定はintent / stage / unit / attempt / batchで追跡できる構造化証拠を保持する。
- error directiveは診断codeと対象correlationを示すが、任意file内容や環境変数を展開しない。
- Retry / Skip / Abort後もfailure evidenceとworktreeを保持する（`business-logic-model.md:45-49`）。
- 同一入力snapshotは同じprojectionとdirective意味を返し、監査再生可能性を保つ。

## Verification

TDDではcross-intent/stage contamination、missing join key、ambiguous attempt、contradictory terminal、stale attemptを故障注入し、すべてerror / cursor unchangedになることを確認する。Stop hook source不変、新workflow state 0、secret/network dependency 0を回帰条件にする。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:48:36Z
- **Iteration:** 1
- **Scope decision:** none

U1のNFR設計は、untrusted audit入力の検証、cross-context隔離、ambiguous/contradictory evidenceのfail-closed、partial projection禁止、最小権限、機密情報を含まない診断を具体化できています。論理構成も既存reader/writerと新規pure projection/resolver、単独adapter ownershipを明確に分離し、Stop hook・generic park・autonomy・#2834領域へ干渉しません。短命Bun CLIという実行モデルとも整合し、追加daemon・DB・network・AWSを必要としない実装可能な設計です。

### Findings

- None
