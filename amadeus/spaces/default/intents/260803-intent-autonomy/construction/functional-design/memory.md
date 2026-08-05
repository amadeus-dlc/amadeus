<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-03T11:53:49Z — `matchedPrefix = cycle.length`をtail一致・reentry待ちsentinelとして使う; #2095の「末尾一致かつ同じcycleへ自然再進入したときだけ発火」を既存projection shapeのまま表現するため
- 2026-08-03T12:35:42Z — U2の`repair`をT未満・strict progress後の決定論的継続、threshold Judgeを初回`replan`・replan後`repair-stalled`のsingletonと解釈した; #2096の閉じた3分岐と上流の収束順序を両立させるため
- 2026-08-03T12:55:19Z — U3の`semi`のphase内auto gateはgrant exerciseではなく、human-provenance付きmodeをbasisとする`AUTO_DECIDED + GATE_APPROVED`の原子commitと解釈した; none/semiのgrant=nullと「すべての自動裁定を監査」を両立させるため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-03T11:53:49Z — optional `frontend-components.md`を生成しない; U1は短命CLIのengine / audit / harness behaviorでUI componentを含まないため
- 2026-08-03T12:35:42Z — U2でもoptional `frontend-components.md`を生成しない; Quality Repairは既存CLI / status表示の拡張でfrontend componentを含まないため
- 2026-08-03T12:55:19Z — U3でもoptional `frontend-components.md`を生成しない; autonomy runtimeは既存CLI / skill / statusの契約でfrontend componentを含まないため
- 2026-08-03T15:32:00Z — U5でもoptional `frontend-components.md`を生成しない; completion behaviorは既存CLI / Bun live runner / audit / registryで閉じ、新規frontend componentを含まないため

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-03T11:53:49Z — Amadeusの保証をcanonical exactly-onceへ限定し、provider effectがpossible / unknownならretryせずparkする; provider非依存と二重外部effect防止を優先し、物理的exactly-onceを根拠なく主張しないため
- 2026-08-03T12:35:42Z — advisory sensorをquality obligationへ昇格せず、blocking指定の失敗・不完全だけを自動修復対象にした; #2096の健全化目的を維持しながらadvisoryの意味を変えないため
- 2026-08-03T12:55:19Z — `AutoDecisionRecord`のdeciderとbasisを分離し、policy / norm / historyはdeterministic-engineのbasisとした; principal / decider / actor / basisの監査語彙を正確に保つため
- 2026-08-03T15:32:00Z — 現行5harnessをGA contract fixtureではexact oracleにし、production evaluatorはregistry-derived cohortを処理する; 現行要件を厳密に満たしつつfuture harness追加でCore分岐を増やさないため
- 2026-08-03T15:48:00Z — U5 reviewer Iteration 1の2 BLOCKERと1 FOLLOW-UPを解消した; U5完全revisionのclosed authorization event、per-harness protected validation event、canonical validation snapshot evaluator、registry生成harness ID型を追加した
- 2026-08-03T16:02:00Z — U5 review上限後の人間選択1に従い残存BLOCKERとFOLLOW-UPを解消した; completion evidenceのclosed payload / canonical event identity / M07 lock内再計算と、registry正本からのHarness ID型再生成手順を定義した
- 2026-08-03T16:14:00Z — U5 fresh cycle 2 Iteration 1のterminal identity BLOCKERを解消した; evidence / ordered events / pre-revisionsを束縛する決定的transaction IDと、成功transaction単位のexpected projection revision +1 oracleを定義した

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-03T12:02:39Z — Reviewer Iteration 1の6 BLOCKERをFunctional Design内のpublic contract refinementで解消した; transition table、EvidenceSnapshot、callable reconciliation、DeliveryCursorSet、Judge trace、Plugin / drift receiptを追加しIteration 2で再検証する
- 2026-08-03T12:11:26Z — fresh review cycle前に残存2 BLOCKERを修正した; M07がMonitor対象eventだけへdense sequenceを予約し、`MonitorManifest.evidenceProviderId`をexactly-one bindingにした
- 2026-08-03T12:25:47Z — fresh review Iteration 1の4 BLOCKERに対し、cross-clone連番を廃止してcontent-addressed delivery + causal predecessor + 耐久`MonitorReplayIndex`に置き換えた; causal forkはfail-closed、predecessor未到着はfull payload保留、epoch跨ぎはchain head引継ぎ、normal cold resumeはMonitor partitionだけを読む
- 2026-08-03T12:45:13Z — U2 reviewer Iteration 1の5 BLOCKERをpublic contract refinementで解消した; terminal observation + previous snapshot入力、obligation二軸taxonomy、typed contribution descriptors、epoch-start eventによるID統一、`any-of[evidence-change,human-retry]`を追加した
- 2026-08-03T12:49:31Z — U2 fresh reviewに向けて`reviewCycleId`をservicesの正本式`H(qualityEpochId + judgeInvocationId + replanFingerprint + cycleIndex)`へ統一した; `previousReviewCycleId`はlinkage専用、`replanId`はreservation / receipt照合専用とした
- 2026-08-03T13:03:22Z — U3 reviewer Iteration 1の4 BLOCKERを既存要件から補完した; system / legacy fail-closed provenance、Core effect registryとcurrent norm再検証、gate専用queue非対象review state、terminal failureの同一transaction監査を追加し、2067-ACのU3/U5所有境界も明記した
- 2026-08-03T13:21:31Z — reviewer上限到達後の人間選択1に従い、grant exercise event名を上流公開契約の`INTENT_GRANT_EXERCISE_RESERVED / INTENT_GRANT_EXERCISED / INTENT_GRANT_EXERCISE_ABORTED`へ統一した; あわせてsecondary ownerである2067-AC14 / AC21の統合境界を追跡表へ追加した
- 2026-08-03T13:30:22Z — U4はcompleted sealを変更せず`AUTO_DECISION_REVIEWED`だけを別hash-chainへprotected appendする設計とした; flagはrollback / Intent自動作成を行わず、contract defectならself-fix、仕様追加・変更ならself-featureを非実行提案する
- 2026-08-03T13:38:12Z — U4 reviewer Iteration 1で判明したcompleted reviewのhuman-turn配置について、人間はactive Intent参照を選択した; active source auditのreal HUMAN_TURN receiptをcompleted target / decision / choiceへ束縛し、target sealの例外を`AUTO_DECISION_REVIEWED`以外へ広げない
- 2026-08-03T13:47:53Z — U4 reviewer上限後の人間選択1に従い、上流primitiveから全public typeを閉じた; human authorization input、decision page/detail/receipt、explicit status scope/counts、exact 5 harness tupleとsuccess/error oracle、audit/trace OTel属性を定義した
- 2026-08-03T13:58:47Z — U4 fresh reviewのsource trust gapに対し、人間はM07直接readを選択した; caller audit/receiptを廃止し、closed review payload / post-seal extension、canonical-tuple-v1 identity、withheld nullable evidence、safe principal/actor、session/process/clone reload oracleを追加した
- 2026-08-03T14:13:33Z — U4 reviewer上限後の主体gapに対し、人間はreview human principal=actorを選択した; decision safe主体欠落はnull/withheld、canonical-value-v1 nested digest、golden vectors、compactionを含む4-boundary persistence oracleを追加した
- 2026-08-03T14:22:56Z — U4 fresh cycle 3 Iteration 1の4 BLOCKERを解消した; 新規AUTO_DECIDED subject_v1 producer、filter fingerprint / cursor identity分離、payloadからのfull receipt再構築、payload digest / transactionを含むpost-seal chainへ具体化した
- 2026-08-03T14:36:00Z — U4 review cycle 3上限後の人間選択1に従い残存2 BLOCKERを解消した; planAutoDecisionCommitのsubject必須実配線と、flag classification / safe note digestを含むreview_command_v1 human bindingをclosed contract化した
- 2026-08-03T14:48:00Z — U4 fresh cycle 4 Iteration 1の3 BLOCKERを解消した; AUTO_DECIDED commit authorizationをsemi mode provenance / full grant exerciseのclosed unionにし、完全なAuditEventPlanとM05-owned・M07-implementedのcanonical actor registry portを定義した
- 2026-08-03T15:02:00Z — U4 review cycle 4上限後の人間選択1に従い残存principal provenance BLOCKERを解消した; M04-owned authorizerがcanonical auditからsemi/full principal receiptを発行・再検証し、M05 plannerとM07 lock内revisionへ束縛する経路を定義した
- 2026-08-03T15:14:00Z — U4 fresh cycle 5 Iteration 1のrevision BLOCKERを解消した; M07 adapterがcanonical multi-shard audit / authoritative lock revision / state projection revisionを同一snapshotで返し、receipt発行・再検証・append CASへ同じrevisionを使うcontractにした
