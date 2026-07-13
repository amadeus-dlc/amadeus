## Interpretations

- 2026-07-13T16:30:31Z — NFR Requirementsはprovider実行時間/tokenの数値SLOを新設せず、pure policyにはcall count、計算量、memory bound、決定性100%を測定可能なtargetとして使う。
- 2026-07-13T16:30:31Z — U-01はnetwork serviceや永続stateを持たないためavailability SLA、backup、multi-AZはN/Aとし、reliabilityをside effect 0、canonical digest一致、closed branch coverageで定義する。
- 2026-07-13T16:35:31Z — U-02の性能目標はprovider wall-clockではなくcall count、計算量、lock境界、不可逆副作用数で規定した; 上流が実行時間/tokenの数値SLOを明示的に非目標としているため。
- 2026-07-13T16:43:31Z — U-03の5/10/30秒・総45秒はcapability probe deadlineとして扱い、Claude native batchのlatency SLOとは扱わない; 上流のtimeout contractとruntime SLO非設定を両立するため。
- 2026-07-13T16:48:54Z — U-04の各probe step timeoutは総45秒の残りbudget内のceilingとして解釈した; 個別上限の単純和をcandidate deadlineにしない上流契約を維持するため。
- 2026-07-13T16:53:47Z — U-05の最大4並列はwave内Unit数と解釈し、active wave自体は最大1件にした; balanced waveとconductor-mediated前wave gateを両立するため。
- 2026-07-13T16:59:22Z — U-06のclosure domainはregistry/projection/docs/platform/live/Issueの6件とし、FR coverageはclosure全体へ追加でANDするvalidationと解釈した; 上流の6-domain表現とcoverage必須契約を両立するため。

## Deviations

- 2026-07-13T16:30:31Z — なし。stageの5成果物をU-01 recordへ生成した。
- 2026-07-13T16:35:31Z — U-02ではservice availability、backup、multi-region目標をN/Aとした; local CLI lifecycleでservice/databaseを持たず、false successとcrash reconciliationが実質的な信頼性境界であるため。
- 2026-07-13T16:43:31Z — U-03のcredentialed native proofはmacOS、GitHub Actions Linuxはfake suiteに限定した; 上流Functional DesignとRequirementsのplatform matrixをそのまま採用したため。
- 2026-07-13T16:48:54Z — U-04のNFRへ特定Codex model slugを固定しなかった; runtime-resolved exact modelをcatalog/SessionStartへ束縛する上流設計に従ったため。
- 2026-07-13T16:53:47Z — U-05はV3や未知session profileへのdegradeを定義せずparkとした; V2-onlyとunknown schema非推測の上流契約に従ったため。
- 2026-07-13T16:59:22Z — U-06ではbuild/test/live/GitHub networkのwall-clock SLOを置かず、manifest read count、計算量、report決定性で性能を規定した; 上流がruntime SLOを設定していないため。

## Tradeoffs

- 2026-07-13T16:30:31Z — machine依存wall-clock gateよりoperation count/complexity propertyを選び、上流の「数値runtime SLOなし」と再現可能なperformance regression検知を両立した。
- 2026-07-13T16:35:31Z — Unit mergeの並列化よりslug順serial finalizeとsingle claimを優先した; 同一targetへのGit mutationを決定的かつ再調停可能に保つため。
- 2026-07-13T16:43:31Z — Ultra Codeの未知surfaceをpermissive parseするよりversioned profileとparkを選んだ; false native success 0件と機密raw trace非保存を優先するため。
- 2026-07-13T16:48:54Z — user authをprovider processへ維持しつつmodel-generated toolを`inherit=\"none\"`へ隔離する二環境構成を選んだ; native実行可能性とcredential/evidence保護を両立するため。
- 2026-07-13T16:53:47Z — wave並列化やdynamic rebalanceより2〜4 balanced serial waveを選んだ; Kiro上限、Unit全件性、C-08/C-11 gate、resume決定性を優先するため。
- 2026-07-13T16:59:22Z — stale candidateの部分receipt再利用よりtree変更時の全再評価を選んだ; same-tree provenanceとfalse closure 0件を優先するため。

## Open questions

- 2026-07-13T16:30:31Z — なし。U-01 NFR成果物生成を止める未確定事項はない。
- 2026-07-13T16:35:31Z — なし; U-02 NFRに必要な定量境界は上流Functional DesignとRequirementsで確定済み。
- 2026-07-13T16:43:31Z — なし; Ultra Code surface discovery未成立時のpark条件を含め、U-03 NFRの判断は上流で確定済み。
- 2026-07-13T16:48:54Z — なし; official collaboration/hook/env isolation surfaceを取得できない場合のpark条件を含め、U-04 NFRの判断は上流で確定済み。
- 2026-07-13T16:53:47Z — なし; parent relation/completed terminalまたはstdin ingestionを取得できない場合のpark条件を含め、U-05 NFRの判断は上流で確定済み。
- 2026-07-13T16:59:22Z — なし; Issue競合時のhuman/external resolutionを含め、U-06 NFRの判断は上流で確定済み。
