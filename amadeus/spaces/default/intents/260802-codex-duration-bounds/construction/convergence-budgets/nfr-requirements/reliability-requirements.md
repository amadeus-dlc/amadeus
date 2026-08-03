# Reliability Requirements — convergence-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Termination と Recovery SLO

`requirements.md` NFR-01／02／07、`business-logic-model.md` のreserve／claim／confirm／finish、`business-rules.md` BR-CB-13〜27、`technology-stack.md` のdeterministic test seamを適用する。可用率ではなく、各開始要求が必ずbounded decisionへ到達する処理単位SLOとする。

| ID | Invariant | Target | Failure behavior |
|---|---|---|---|
| RL-CB-01 | bounded continuation | interactive default 2、autonomous default 8、hard cap 10 | cap+1を開始せず`budget-exhausted` |
| RL-CB-02 | bounded retry | default 2、hard cap 3 | 追加retry 4回目を開始せずsafe-stop |
| RL-CB-03 | monotonic counter | decrement／reset 0件 | resume／compact／audit noise後も同じvalue |
| RL-CB-04 | atomicity | reservation、counter、attemptの部分commit 0件 | commit失敗は全て未開始のtyped refusal |
| RL-CB-05 | idempotency | 同一key replayのcounter／attempt増分0 | 既存receiptを返す |
| RL-CB-06 | dispatch crash | effect unknown時の再dispatch 0件 | `dispatch-effect-unknown`で安全停止 |
| RL-CB-07 | total classification | RetryFactsの全入力がretryable／non-retryable／unsafe-unknownの1結果 | 例外や自由解釈へfallbackしない |
| RL-CB-08 | termination usability | 全停止結果がreason、consumed/cap、last progress、next actionを持つ | canonical write不能時だけ`persisted:false` process responseで代替 |

## Failure Isolation

- `worker-spawn-unavailable`と`read-only-probe-timeout`でも`no-effect-confirmed`でなければretryしない。
- retryの1回が失敗してもcounterを巻き戻さず、同じoperationの新attemptだけを予約する。
- state inconsistency、policy mismatch、unknown version、canonical write failureは自動復旧を試みず、人間に再計画根拠を返す。
- Stop budget exhaustedはworkflow全体の成功へ偽装せず、安全停止または既存halt-and-ask boundaryへ渡す。
- semantic monitorが「進捗あり」と判定してもhard cap到達後の継続を許可しない。

## Deterministic Verification

- `cap-1`／`cap`／`cap+1`を全6 budget kindに共通のproperty testとして適用する。
- audit noise 100件、status read 100件、sensor event 100件を挿入してもStop counterが同じ結果となるregressionを追加する。
- reserve後crash、claim後crash、native受付後confirm前crash、finish reply前crashの各pointをfault injectionする。
- v1 allowlistの4 positive行と、effect／cause／surface／versionの全negative代表をtable-driven testにする。
- control／treatmentはUnit 1のidentityで相関し、attempt数とtermination reasonが欠測したrunを比較対象にしない。
