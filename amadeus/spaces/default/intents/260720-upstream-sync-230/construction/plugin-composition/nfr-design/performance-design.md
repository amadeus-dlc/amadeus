# Performance Design — plugin-composition

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Inspect・plan pipeline

`inspectPlugin`はsame-name、malformed manifest、unknown seam、clobberを既決の決定順で全数検査し、最初のerrorで残余診断を隠さない。一件でもerrorがあればrejectedとしてplan/writeを開始せず、全件validな場合だけ`planPluginComposition`へ委譲する。

plan対象はno-clobber copy、`produces`・`consumes`・`sensors`・`required_sections`の4 seam merge、宣言fragment、shared contributionだけに限定する。暗黙seam、deferred面、対象外workspace scanを追加しない。

## Temp verificationとcommit

composeはtemp hostへplanを一度適用し、既存C1/C2 compileとsensorを通した後だけcanonical transactionへ進む。dropもtemp hostでcompileとdoctorを通した後だけ進む。canonical hostへの逐次試行write、parallel commit、retry、cache、cross-workspace batchは行わない。

workspace lock取得直後に未完了PREPARED journalがあれば、新規compose/dropより先に回復する。回復中は新規操作を開始しない。新しいscan time、latency、throughput SLOは設けない。

## Verification

- 複数inspect errorを一つのfixtureで全件返し、host/record/audit write 0を確認する。
- temp compile/sensor/doctor failureの各点でcanonical三面bytesを不変にする。
- 単一/複数plugin contributionと全crash境界で決定順と結果bytesを固定する。
- targeted testsとfull verificationを同一最終SHAで通し、stale結果をgreenへ読み替えない。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U10-01〜04、`security-requirements.md`のvalidation-before-write、`scalability-requirements.md`の寄与/write-set境界、`reliability-requirements.md`のatomic recovery、`tech-stack-decisions.md`の既存C1/C2/C4 stack、`business-logic-model.md`のInspect/Atomic workflowsを具体化する。

## Review — Iteration 1

- Reviewer identity: amadeus-architecture-reviewer-agent
- Reviewed at (UTC): 2026-07-21T03:52:13Z
- Verdict: READY
- Iteration: 1
- Critical / Major / Minor: 0 / 0 / 0

### Scope decision

closed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。consumes元、`memory.md`、`plan.md`、reasoning、record root、sibling Unit成果物は対象外である。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

正準6 public seamと内部discover、全inspect error収集、shared contribution ownership、host/record/audit三面WAL、mutation前PREPARED、三面完了後COMMITTEDが5成果物間で整合している。handled failureと未完了PREPAREDはpre-stateへ回復し、durable COMMITTEDはpost-state・record・audit onceを維持する。新signature、ownership、recovery分類、journal format、atomicity、retry、dependency、service、SLOへのscope逸脱はない。

### Sensor evaluation

- required-sections: PASS（5成果物すべてにH2見出しが2件以上ある）
- upstream-coverage: PASS（5成果物すべてが`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を参照する）
- answer-evidence: PASS（Q&Aに既決裁定と`[Answer]`がある）
- linter: 非該当（Markdown-only）
- type-check: 非該当（Markdown-only）

### Recorded review裁定

E-USSU16NDR1はREADYを受理（推奨）し、未解決findingなしとするchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:55:12Z`）。PREPARED pre-state回復とCOMMITTED post-state維持も受理範囲に含む。

## §13 disposition

E-USSU16NDS13はmemory entries、candidates、parked open questionsが0/0/0であることを確認し、0件で可（推奨）・新規横断学習なしとするchoice 1を3票、choice 2を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:55:12Z`）。prescriptive rule、verification sensorともにpersistしない。
