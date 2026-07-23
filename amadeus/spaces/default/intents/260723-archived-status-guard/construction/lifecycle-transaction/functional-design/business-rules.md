# Business Rules — lifecycle-transaction

`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`からtransaction、human-presence、audit、recovery規則を具体化する。

## Lock and capability rules

- BR-01: registry、cursor、auditを読む公開入口はpreflightを通り、lock取得直後にrecoveryを完了する。
- BR-02: `LockedLifecycleContext`はpreflight callback中だけ有効で、return/throw後に失効する。
- BR-03: locked helperはactive tokenとproject/spaceをruntime照合し、不一致をfail-fastする。
- BR-04: callback内でlock取得wrapperを呼ばず、locked版helperだけを使う。

## Human-presence rules

- BR-05: archive/unarchiveは実HUMAN_TURNなしで開始できない。
- BR-06: 候補turnは同じshardの最新resolution eventより後にある最新HUMAN_TURNである。
- BR-07: resolution eventは`QUESTION_ANSWERED`、`GATE_APPROVED`、`GATE_REJECTED`、委任/standing-grantの発行・取消、`INTENT_ARCHIVED`、`INTENT_UNARCHIVED`を含む。
- BR-08: 未完了journalまたは既存lifecycle eventが同じ`{shard,timestamp}`を参照していれば消費済みである。
- BR-09: journal作成後のrecoveryは予約turnを再選択せず、同じtimestampとuser inputを使う。
- BR-09a: 同一shard内に同じtimestampのHUMAN_TURNが複数あれば、予約前にambiguity errorとして拒否する。
- BR-09b: lifecycle eventは予約HUMAN_TURNと同じshardへappendし、eventの保存先shardとpayload timestampから消費identityを再構成する。

## Transaction rules

- BR-10: operationIdは新規journal作成時にtoolが一度だけUUID生成する。
- BR-11: commit順はaudit → registry → cursorであり、各step完了をjournalへatomic記録する。
- BR-12: audit appendはoperationId + event typeで全shardを検索し、0件なら予約turnと同じshardへappendする。1件なら保存先shardと全immutable payloadがjournalに完全一致するときだけsuccess、その他はfail-closedとする。
- BR-13: archiveだけがactive cursor一致時にcursorをclearする。unarchiveはcursorを設定・変更しない。
- BR-14: final verification成功後にjournalを削除する。完了markerや履歴copyは残さない。
- BR-15: 正常な再実行は新しいoperationとして新operationIdと新HUMAN_TURNを要求する。未完了journalのrecoveryだけが既存operationを継続する。

## Failure and recovery rules

- BR-16: journal作成前の失敗ではaudit、registry、cursorのbytesを保持する。
- BR-17: journal作成後の失敗では完了済みdurable stepを巻き戻さず、journalからforward recoveryする。
- BR-18: recoveryは同じoperationIdのauditを重複appendしない。
- BR-19: readerはrecovery後の状態だけを返し、durable中間状態を公開しない。
- BR-20: corrupt/unknown/inconsistent journalは削除、rename、推測修復せず、workspace全操作をfail-closedにする。
- BR-21: journal削除失敗ではcommit済み最終状態とjournalが残る。次回recoveryは全stepをidempotent確認して削除を再試行する。
- BR-22: valid step flagsは`FFF`、`TFF`、`TTF`、`TTT`だけである。その他の組合せは順序違反としてrecoveryしない。
- BR-23: archive journalはfrom=`in-flight|parked|complete`、to=`archived`、unarchive journalはfrom=`archived`、to=`in-flight`だけを許可する。

## Test rules

| Boundary | Immediate expectation | Recovery expectation |
|---|---|---|
| validation | journal/audit/registry/cursor不変 | 入力修正後に新規実行 |
| journal write | audit/registry/cursor不変 | journal不在なら新規実行 |
| audit pre-validation | journalのみ残る | 同operationIdでauditから再開 |
| audit commit | event 0件または1件、registry/cursor旧値 | event一件性を保ってregistryへ進む |
| registry write | audit一件、registry旧値または新値 | toStatusへ収束 |
| cursor write | audit一件、registry新値、cursor旧値 | archive時だけcursorへ収束 |
| journal completion | 最終状態、journal残存可 | 検証後journal削除 |

各testは目的分岐のcoverage、4ファイルのbytes、operationId、HUMAN_TURN timestamp、event件数をassertする。
