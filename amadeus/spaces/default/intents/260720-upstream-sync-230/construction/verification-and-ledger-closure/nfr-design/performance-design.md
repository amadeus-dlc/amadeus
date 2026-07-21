# Performance Design — verification-and-ledger-closure

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Bounded evidence aggregation

`traceCoverage`はapproved 24 itemの固定集合を一度評価し、各itemを最低1つの自動testまたは明示docs検査へ対応付ける。24/24未満をcompleteにせず、EQUIVALENTはcharacterizationがupstream contract全体を満たす場合だけ認める。動的item追加、partial batch closure、第二evidence storeは作らない。

## Same-SHA verification

`assertPhaseVerification`はtargeted evidence、typecheck、lint、dist、promote-self、full CI、local coverageを同じ最終SHAへ束ねて一度評価する。未実施、非0、別SHAをgreenへ読み替えず、patch追加行未カバー0または既決waiver条件を満たす明示証拠を要求する。

`planLedgerTransition`は24 disposition、全必須gate green、最終SHAの三条件を同時に評価し、ledger writeを全verification後の最終operationにする。新parallelism、cache、retry、distributed ledger、時間閾値、service SLOは追加しない。

## Verification

- 24/24、23/24、evidenceなし、partial EQUIVALENTを対照する。
- 各gateの未実施/非0/別SHAを単独fixtureで拒否する。
- patch uncovered lineと証拠なしwaiverを拒否する。
- 同じBLOCKED/APPLIED transitionの再実行でduplicate history 0を確認する。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U12-01〜04、`security-requirements.md`のfalse-green防止、`scalability-requirements.md`の固定集合、`reliability-requirements.md`のclosed transition/idempotency、`tech-stack-decisions.md`の既存CI/ledger stack、`business-logic-model.md`のTrace/Verify/Ledger workflowを具体化する。

## Review — Iteration 1

- Reviewer identity: amadeus-architecture-reviewer-agent
- Reviewed at (UTC): 2026-07-21T04:12:57Z
- Verdict: READY
- Iteration: 1
- Critical / Major / Minor: 0 / 0 / 0

### Scope decision

closed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。consumes元、`memory.md`、`plan.md`、reasoning、record root、sibling Unit成果物は対象外である。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

正準3 public seamと内部classifier、approved 24 itemの24/24 trace、partial EQUIVALENTおよび23/24以下の拒否、same-SHA必須gate、patch追加行未カバー0または既決waiver証拠、FR23/24が5成果物間で整合している。closed transitionはincomplete不変、反証可能根拠と対象SHAを持つstructured BLOCKED、三条件成立時だけのAPPLIEDに限定され、既存atomic ledger writerの同一transition再実行もno-opである。新evidence language、disposition、waiver、transition、writer、dependency、service、SLOへのscope逸脱はない。

### Sensor evaluation

- required-sections: PASS（5成果物すべてにH2見出しが2件以上ある）
- upstream-coverage: PASS（5成果物すべてが`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を参照する）
- answer-evidence: PASS（Q&Aに既決裁定と`[Answer]`がある）
- linter: 非該当（Markdown-only）
- type-check: 非該当（Markdown-only）

### Recorded review裁定

E-USSU18NDR1はREADYを受理（推奨）し、未解決findingなしとするchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T04:16:59Z`）。

## §13 disposition

E-USSU18NDS13はmemory entries、candidates、parked open questionsが0/0/0であることを確認し、0件で可（推奨）・新規横断学習なしとするchoice 1を3票、choice 2を0票、GoA 1を3票で裁定した（開票 `2026-07-21T04:16:59Z`）。prescriptive rule、verification sensorともにpersistしない。
