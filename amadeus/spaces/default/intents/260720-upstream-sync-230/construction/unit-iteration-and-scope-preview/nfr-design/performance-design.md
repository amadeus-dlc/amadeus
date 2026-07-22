# Performance Design — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Pure decision path

`nextConstructionStep`と`previewScopeCost`はinvocation-localなpure decision seamとして維持する。`unit-major`では既存Unit列を外側、StageGraphのcompiled stage列を内側に一方向走査し、最初の未完了かつ実行可能な組で停止する。独自sort、名前順tie-break、別stage listは作らない。

iteration未指定時は既存stage-major resolverへそのまま委譲し、追加matrixを構成しない。state、plan、graph、audit、workspaceへのmutationはdecision後の既存ownerに残す。

## Scope summary derivation

`previewScopeCost`は一つのCompiledGridのeffective in-scope集合を一度評価し、同じ集合からstage数とapproval gate数を導出する。ScopeSummaryをscope confirmation、intent birth、scope-change、validate-gridの4 consumerへ渡し、consumer別の再集計やhardcoded countを行わない。

新cache、parallelism、retry、precomputed第二grid、scan time threshold、service latency/throughput SLOは追加しない。

## Verification

- 2 Unit×複数stageでUnit外側・既存Unit順・compiled stage順を固定する。
- 未指定fixtureでdirective、state、human/JSONのbaseline bytes差分を0にする。
- 全scopeでstage/gate countをCompiledGridと照合し、4 consumer間のcount差分を0にする。
- targeted testsとfull verificationを同一最終SHAで通し、stale結果をgreenへ読み替えない。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U05-01〜04、`security-requirements.md`のmutation-before-reject、`scalability-requirements.md`のmatrix/grid境界、`reliability-requirements.md`のdefault互換、`tech-stack-decisions.md`の既存C2 stack、`business-logic-model.md`の2 workflowを具体化する。

## Review — Iteration 1

- Reviewer identity: amadeus-architecture-reviewer-agent
- Reviewed at (UTC): 2026-07-21T03:43:27Z
- Verdict: READY
- Iteration: 1
- Critical / Major / Minor: 0 / 0 / 0

### Scope decision

closed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。consumes元、`memory.md`、`plan.md`、reasoning、record root、sibling Unit成果物は対象外である。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

正準2 pure seam、明示opt-inの`unit-major`、未指定時のstage-major byte互換、不正iterationの全mutation前reject、単一CompiledGrid由来のScopeSummary、4 consumer共通投影、JSON additive `summary`が5成果物間で整合している。新signature、vocabulary、tie-break、count、failure、ownership、cache、dependency、service、SLOへのscope逸脱はない。

### Sensor evaluation

- required-sections: PASS（5成果物すべてにH2見出しが2件以上ある）
- upstream-coverage: PASS（5成果物すべてが`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を参照する）
- answer-evidence: PASS（Q&Aに既決裁定と`[Answer]`がある）
- linter: 非該当（Markdown-only）
- type-check: 非該当（Markdown-only）

### Recorded review裁定

E-USSU15NDR1はREADYを受理（推奨）し、未解決findingなしとするchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:46:26Z`）。

## §13 disposition

E-USSU15NDS13はmemory entries、candidates、parked open questionsが0/0/0であることを確認し、0件で可（推奨）・新規横断学習なしとするchoice 1を3票、choice 2を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:46:26Z`）。prescriptive rule、verification sensorともにpersistしない。
