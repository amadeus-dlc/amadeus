# Reliability Design — text-mutation-loud-failure

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。対象存在、postcondition、all-or-nothing、副作用順序、writer commit phaseを状態機械で固定する。

## Transaction状態機械

| state | event | next／public effect |
| --- | --- | --- |
| `unvalidated` | invalid target／duplicate target key | `failed(input)`、stderr／exit 1、他副作用0 |
| `unvalidated` | state validation failure | `failed(validation)`、stderr／exit 1、他副作用0 |
| `validated` | setter `not-found` | `failed(not-found)`、stderr／exit 1、他副作用0 |
| `validated` | `StateMutationInvariantError` | `failed(invariant)`、stderr／exit 1、他副作用0 |
| `validated` | unknown exception | existing internal boundaryへrethrow |
| `validated` | 全step＋final postcondition成功、同一bytes | `ready(verified-no-write)`、writer 0、adapter private branchでcaller既存success意味だけ継続 |
| `validated` | 全step＋final postcondition成功、差分あり | `ready(candidate)`、writer最大1 |
| `writing` | rename前failure | `failed(pre-commit)`、original state／audit bytes、success 0 |
| `writing` | rename成功＋directory fsync成功 | `committed-write`、adapter private branchでその後だけaudit／success |
| `writing` | rename後directory fsync failure | `failed(post-commit-durability)`、candidate stateを再読確認、failure presenterへ接続、audit／success 0 |

failure後のretry、resync、warning successは0回である。bulk途中failureではcurrent／candidate参照を破棄し、writerへ到達しない。

## Setterとerror transport

`setCheckbox`／`setStageSuffix` は `ValidatedStageState` を受け、`changed(content) | not-found(target)` だけを返す。mutation後reparse、postcondition、非対象projectionの破損は正常variantへ追加せず、閉じたreasonの `StateMutationInvariantError` をthrowする。

`MutationTransaction` がこの専用型だけを型guardでcatchして `failed(invariant)` へ変換する。unknown exceptionはnot-found／invariantへ畳まず、既存internal boundaryへrethrowする。caller adapterはresult kind／error typeで分岐し、message解析を行わない。

## Atomic writer境界

既存 `writeFileAtomic` のtemp create／write／file fsync／rename前をpre-commit、`renameSync(tmp, path)` 成功をcommit point、directory fsyncをpost-commit durability区間とする。

- pre-commit failure: canonical stateはoriginal bytes、全永続auditはbefore bytes。
- commit success: canonical stateはcandidate bytes。directory fsync成功後だけmutation audit／successを実行する。
- writerがthrowした場合、portはcanonical stateを一度再読する。original bytesなら `failed(pre-commit)`、candidate bytesなら `failed(post-commit-durability)` とし、前二者を `MutationFailurePresenter` へ渡す。original／candidate以外または再読不能は分類せず既存internal boundaryへ再throwする。
- post-commit durability failureではrollbackせず、全永続auditをbefore bytes、stdout／successを0件に保ち、caller既存stderr `error` JSON／exit 1へ投影する。

idempotent同一bytesではwriterを呼ばず、transactionは `ready(verified-no-write)` を返す。audit／success capabilityはadapterのprivate closureにあり、このvariantを処理する同一stack frameからだけ呼ぶ。writer errorを自動retryせず、回復は状態を再読した新しい明示invocationで行う。

## Determinismとobservability

bulk targetは `slug + dimension` byte順にsortし、同一validated bytesとtarget集合から同じfailure target、content、stderr JSONを生成する。timestamp、PID、absolute path、state全文をerrorへ含めない。

test seamはparser、renderer、writerを注入可能にし、result kind、error class、parse／setter／writer／audit／success／retry／resync count、state／全永続audit before／after digestを観測する。本番orderingと異なるtest-only shortcutは作らない。

## Failure injection

| injection | required postcondition |
| --- | --- |
| malformed／duplicate state | setter 0、writer／audit／success 0、全bytes不変 |
| invalid target／duplicate target | parse／setter 0、全bytes不変 |
| not-found | writer／audit／success／retry／resync 0、全bytes不変 |
| reparse／postcondition／non-target change | `StateMutationInvariantError`、全bytes不変 |
| writer temp／write／file fsync／rename failure | original state、audit before、success 0 |
| writer directory fsync failure | candidate state、audit before、success 0 |
| unknown exception | internal boundaryへrethrow、偽success 0 |

## Recovery objectives

- RPO: pre-commit failure時のstate／audit byte loss 0、commit後はcandidateの完全bytesだけを許可する。
- Retry: 同一invocation内0回。
- Recovery: validation系は入力修復後1回、pre-commit writer failureは原因除去後1回、post-commit failureはstate再読後にcallerが必要性を判断する。
- Compatibility: jump、utility compose／set-status、state transaction／gate／Bolt mergeでstderr `error` JSON、exit 1、stdoutなしを維持する。

backup、replication、failover、circuit breakerはlocal canonical fileのsingle-writer mutationには非適用である。
