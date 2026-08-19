# Security Test Instructions

## 適用判定

Requirements の NFR に認証、認可、秘密、外部入力の新規境界はなく、本 Issue は local audit/state の fail-closed predicate 修正である。そのため新規 SAST/DAST、dependency、IaC security test は **N/A** とする。

## 代替確認

既存 typecheck/lint と targeted regression を実行し、audit note を含む診断文字列が completion を誤って許可しないことを確認する。新しい security control や外部通信を追加しない。
