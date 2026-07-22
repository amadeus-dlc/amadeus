# Performance Design — swarm-and-next-stage

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Invocation-local decision設計

`selectNextSwarmBatch`と`resolveNextInScopeStage`は、受け取ったimmutable inputを同期評価するpure decision seamとして維持する。前者は回復済みBoltDagのbatchを記録順に走査し、currentRunで最初の未完了batchを発見した時点でbatch走査を止め、そのbatch内の未完了unitだけを返す。後者はCompiledGridのcurrent後方をcompiled orderで走査し、最初のin-scope stageを返す。

state、audit、workspace、lock、worker dispatch、mergeは両seamから呼び出さない。第二recovery、precomputed index、priority queue、cache、retry、parallelism policyを追加せず、入力順を性能と意味の双方の正本にする。

## Bounded work

batch選択は先頭未完了batchまでのbatch数と、そのbatchまでに検査するunit数に比例する。next-stage解決はcurrent後方で最初のin-scope stageまでのstage数に比例する。全graphの別sort、全候補のmaterialization、consumer別indexは行わない。

runtime serviceのlatency/throughput SLO、絶対scan時間、worker数の閾値は設定しない。既決のtable-driven fixturesと同一最終SHA verificationを合格条件とする。

## Verification

- 2 batch以上で先頭batchが全convergedなら次の未完了batch、未完了unitが残れば同batchだけを選ぶ。
- currentRun外のclaimとmerge failureをconvergedへ数えず、後続batchの先取りを0件にする。
- current直後に連続SKIPがあってもcompiled order上の最初のin-scope stageだけを返す。
- FR-0 EQUIVALENT経路はproduction observable bytes/result差分0とし、targeted regression evidenceだけを追加する。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U03-01〜04、`security-requirements.md`のstale evidence防止、`scalability-requirements.md`の線形順序保存、`reliability-requirements.md`の選択正当性、`tech-stack-decisions.md`の既存Bun/TypeScript stack、`business-logic-model.md`の2 workflowを具体化する。

## Review — Iteration 1

- Reviewer identity: amadeus-architecture-reviewer-agent
- Reviewed at (UTC): 2026-07-21T03:31:04Z
- Verdict: READY
- Iteration: 1
- Critical / Major / Minor: 0 / 0 / 0

### Scope decision

closed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。consumes元、`memory.md`、`plan.md`、reasoning、record root、sibling Unit成果物は対象外である。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

正準2 pure seam、BoltDag記録順、currentRun convergence、merge failure非収束、CompiledGrid順、SKIP除外、terminal `null`、gate-engine同一resolver、FR-0 EQUIVALENTが5成果物間で整合している。新signature、shape、tie-break、failure policy、ownership、parallelism、dependency、service、SLOへのscope逸脱はない。

### Sensor evaluation

- required-sections: PASS（5成果物すべてにH2見出しが2件以上ある）
- upstream-coverage: PASS（5成果物すべてが`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を参照する）
- answer-evidence: PASS（Q&Aに既決裁定と`[Answer]`がある）
- linter: 非該当（Markdown-only）
- type-check: 非該当（Markdown-only）

### Recorded review裁定

E-USSU14NDR1はREADYを受理し、未解決findingなしとしてreviewを閉じるchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:36:36Z`）。

## §13 disposition

E-USSU14NDS13はmemory entries、candidates、parked open questionsが0/0/0であることを確認し、0件で可・新規横断学習なしとするchoice 1を3票、choice 2を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:36:36Z`）。prescriptive rule、verification sensorともにpersistしない。
