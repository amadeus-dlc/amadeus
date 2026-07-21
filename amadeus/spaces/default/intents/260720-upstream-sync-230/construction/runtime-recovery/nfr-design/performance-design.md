# Performance Design — runtime-recovery

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。local artifact/cache/audit recoveryを決定的なparse・sort・atomic commitへ閉じる。

## DAG resolution path

`recoverBoltDag(runtimeCache, dependencyArtifact)`はruntime cacheを型検査した後、canonical `unit-of-work-dependency.md`を既存pure parserで一度parseする。artifact absentだけを`none`、valid sourceを`ok`、unreadable/malformed/unknown edge/self edge/cycleを`malformed`として返す。

valid sourceではcanonical batchesを一度生成し、cache欠落・空・malformed・不一致を`healed: true`としてmemory上で置換する。read-sideはruntime graphを書かず、次の既存compile transitionへpersistent healを委ねる。per-unit loop、coverage guard、swarmは同じresolution resultを共有し、consumer別fallbackやdirectory sweepを持たない。

## Revision evidence path

`recoverGateRevision(events, stageContract)`は全audit shardから関連6 eventだけを抽出し、Timestamp昇順、同値は元buffer position順で一回sortする。対象stage/unit、declared produces path suffixへfilterし、memory、questions、reviewer append、他Unit、non-producesを証拠へ入れない。

organic gate-openまたはstage-start fallbackをanchor、最初のhuman turnをpivotとし、pivot後のdeclared-produces writeとreject absenceをclosed predicateで評価する。filename順、無制限scan retry、wall-clock thresholdは使わない。

## Atomic approve path

predicate true時はRecovered 3 blockとnormal approval 2 block、最終state bufferをmemory上で生成し、必須field・順序・transaction identityを全数検証する。既存audit lock内で5 blockを単一atomic commitし、その成功後だけ最終`[x]` stateを一度writeする。

生成・検証・commit失敗はaudit/state双方を呼出前bytesへ保つ。commit後state writeだけが失敗した場合、次回は完全batchを既決transaction identityで検出し、audit追加0で同じ最終stateへ収束する。

## Verification・resource境界

cache/source matrix、large/multi-shard chronology、timestamp tie、5 block各failure boundary、state-write failure second runをfixture化する。daemon、network、database、queue、別cache/storeを追加しない。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U02-01〜04、`security-requirements.md`のintegrity control、`scalability-requirements.md`の3/6/4 closed set、`reliability-requirements.md`のrecovery/transaction matrix、`tech-stack-decisions.md`のBun/lock/generator、`business-logic-model.md`のDAG/Gate recovery flowへ対応する。

## Review — Iteration 1

- Verdict: READY
- Reviewer: amadeus-architecture-reviewer-agent
- Date: 2026-07-21T02:39:11Z
- Iteration: 1

### Scope decision

既定のclosed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。`memory.md`、`plan.md`、reasoning、record root、sibling Unit、consumes元ファイルは対象外である。

### Sensor results

orchestrator実測では、適用されたrequired-sections、upstream-coverage、answer-evidenceを含む検査は11/11 PASSである。Markdown-only成果物のためlinterとtype-checkは非該当である。本reviewでは、その実測結果と指定された成果物の内容を照合した。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

canonical dependency artifactを優先するDAG recovery、read-side mutation 0、3 consumerの同一Unit集合、関連6 eventの決定的正規化、Recovered 3 + normal 2の事前生成・全数検証・単一atomic commit、commit後state failureからの完全batch再利用、および6 harness/4 self-install投影が5成果物間で整合している。公開面は承認済み2 seamに限定され、新規transaction identity、event、store、service、runtime dependencyへのscope拡張もないため、実装へ進める状態である。
