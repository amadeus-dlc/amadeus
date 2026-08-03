# Performance Requirements — convergence-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Budget Values と Latency

`requirements.md` FR-02／03／04A、`business-logic-model.md` のatomic reserve／allowlist、`business-rules.md` BR-CB-01〜27、`technology-stack.md` の現行Stop capとspawn retry実測を正準入力とする。[Issue #1998](https://github.com/amadeus-dlc/amadeus/issues/1998) のtakt比較で示された10回を決定的な第二天井として採用する。

| ID | Budget／operation | Default | Hard cap | Performance target |
|---|---|---:|---:|---|
| PR-CB-01 | `stop-continuation` interactive | 2 | 10 | reserve判定は1 canonical lock transaction、同一key replayのevent追加0 |
| PR-CB-02 | `stop-continuation` autonomous／gated | 8 | 10 | audit noiseが毎回増えても10回を超えるcontinuation開始0 |
| PR-CB-03 | `recoverable-retry` | 2 | 3 | 初回attempt後の自動retryだけを数え、最大3 retryで必ずterminal decision |
| PR-CB-04 | retry backoff | 50ms×retry ordinal | 1回250ms、累計750ms | fake schedulerで検証し、canonical lock保持中にsleep 0ms |
| PR-CB-05 | classification | v1 allowlist 4行 | 4行 | table lookupはO(1)、自由記述error本文scan 0回 |
| PR-CB-06 | control／treatment | Unit 1と同じ3 warmup＋20 runs | 固定 | duration、attempt、counter、termination reasonを同じcohortで比較 |

`recoverable-retry`のcapは「追加retry数」であり、最初の通常attemptを含まない。retry ordinal 1〜3のlinear backoffは50／100／150msで、hard cap設定でも累計300msである。250ms／750msは将来のbackoff設定を拒否する外側の安全上限であり、v1 defaultを引き上げない。

## Progress と Termination Performance

- progress signatureはstage instanceとcanonical state transitionだけから導出し、audit行数、sensor event、status表示、補助tool activityを入力にしない。
- Stop hookは同一stage rootの累積continuation countを使う。所見減少を検出してもcounterをresetせず、実stage transitionで新stage instanceへ移った場合だけ別BudgetSubjectになる。
- cap到達時の判定は次のhook invocationまで待たず、cap+1要求のreserve前にO(1)で拒否する。
- retry分類とbudget reserveはnative dispatch前に完了する。effect unknownを照会するread-only probe自体がtimeoutした場合は再帰retryせずsafe-stopする。
- canonical foldがevent数Eに対してO(E)であっても、同一判定内でkindごとに全auditを再scanするO(E×K)を禁止する。

## Benchmark と Acceptance

- audit noiseをcontinuation間に100件ずつ追加するfixtureでもdefault 8／hard 10で同じcounter結果になること。
- `cap-1`／`cap`／`cap+1`、resume、compact、別worker ID、同一idempotency replayをtable-driven testで検証する。
- treatmentがcontrolより短いことだけを成功条件にせず、termination reasonとcounterが正しいことを先にblocking判定する。
- live providerのwall-clock差はadvisoryで、deterministic capの合否を免除しない。
