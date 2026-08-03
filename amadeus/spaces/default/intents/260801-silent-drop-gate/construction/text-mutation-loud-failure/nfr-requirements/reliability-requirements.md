# Reliability Requirements — text-mutation-loud-failure

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。availability SLAではなく、1回のmutation transactionが対象存在、postcondition、byte不変、副作用順序を守ることを信頼性の中心に置く。

## 信頼性目標

| ID | 目標 | 合格条件 |
| --- | --- | --- |
| REL-TM-01 | loud not-found | valid documentのtarget 0件は `not-found(target)` となり、全callerでstderr error／exit 1／stdoutなし |
| REL-TM-02 | fail-before-side-effect | validation／not-found／duplicate-target／invariantでstateと全永続audit bytesがbeforeと一致し、write／audit／success／retry／resyncが0回 |
| REL-TM-03 | postcondition | changedは再parse後にtarget値、一意性、非対象identity不変が成立した場合だけ返す |
| REL-TM-04 | atomic bulk | 全targetが成功した場合だけatomic write最大1回。途中failureでは全中間contentを破棄し、writer障害でもcanonical stateはoriginalまたはcandidateの完全な一方だけでpartial bytesを許さない |
| REL-TM-05 | idempotency | already-setは同一bytesのchangedで、physical write 0回。caller固有の既存success意味だけを維持する |
| REL-TM-06 | error transport | `StateMutationInvariantError` だけをR2 transaction boundaryでcatchし、`MutationTransaction.failed(invariant)` へ遷移。未知exceptionは既存internal boundaryへ再throw |
| REL-TM-07 | compatibility | caller familyごとの既存stderr `error` JSON、exit 1、stdoutなしを維持し、新しい公開variantを追加しない |

## Transaction境界

1. 呼出開始時にstateと全永続auditのbefore bytes／digestを取得する。
2. raw stateを完全validateし、opaque `ValidatedStageState` を生成する。
3. mutationをin-memoryで完了し、各stepとfinalのpostconditionを検証する。
4. bytes差分がある成功だけを既存atomic writerへ1回渡す。
5. writer成功を確認した後だけ既存mutation audit／successを実行する。
6. `writeFileAtomic` のtemp open／write／temp fsync／rename前までをpre-commit、同一filesystem `renameSync(tmp, path)` 成功をcommit point、directory open／fsyncをpost-commit durability区間とする。
7. pre-commit failureはcanonical stateをoriginal bytesに保つ。post-commit durability failureはcanonical stateがcandidate bytesであることを再読で確認し、いずれも既存atomic write errorとしてsuccess／mutation auditを生成しない。originalとcandidate以外または再読不能は既存internal error boundaryへ送る。

本Unitは既存single-writer契約を維持し、#1906の並行lock問題を解決したとはみなさない。競合writer下の線形化可能性は本Unitの合否へ含めない。

## Failure分類と回復

- 文法外targetは `InvalidMutationTarget`、malformed／duplicate stateはvalidation failure、valid documentに有効targetが0件ならnot-found、重複target keyはduplicate-target failureとし、相互に畳まない。
- mutation後reparse／postcondition／非対象不変の失敗は閉じたreasonを持つ `StateMutationInvariantError` とする。
- unknown exceptionをnot-foundやwarning successへ変換せず、外側の既存internal error boundaryへ再throwする。
- 認可されたretry／暗黙resyncは0回であり、回復は入力stateを修復した新しい明示invocationで行う。
- failure診断はstderrだけに出し、永続workflow auditやstateへ追記しない。

## 決定性と可観測性

- 同一validated bytes、operation、target集合から同一result kind、content bytes、target順、stderr bytesを生成する。
- bulk targetは `slug + dimension` のbyte順へ正規化し、caller入力順でfinal bytesやfailure kindを変えない。
- test seamでparser／renderer／writerを差し替え、実本番分岐と同じtransaction boundaryを通してfailureを注入する。
- 観測値はresult kind、error class、parse／setter／writer／audit／success／retry／resync call count、before／after digestとする。
- state全文、audit全文、absolute temp path、PID、timestampを公開error JSONへ追加しない。

## 検証要件

- malformed section／checkbox／suffix、invalid target、duplicate slug、not-found、duplicate target、postcondition failure、non-target change、writer pre-commit failure、writer post-commit durability failure、unknown exceptionを個別に注入する。
- validation／invalid-target／not-found／duplicate-target／invariantとwriter pre-commit failureではstate・全永続auditのbefore／after bytes一致を確認する。writer post-commit durability failureではstateが完全なcandidate bytes、全永続auditがbefore bytes、stdout／successが0件であることを確認する。
- changed、already-set、bulk successでfinal reparse、非対象bytes不変、write最大1回を検証する。
- jump、utility compose／set-status、state transaction／gate／Bolt mergeの全caller familyで同じfailure orderingを固定する。
- path separator、改行、target入力順を変えた反復でもcanonical resultが安定することをgolden testで確認する。
