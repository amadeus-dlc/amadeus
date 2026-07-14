## Interpretations

- 2026-07-13T17:10:48Z — U-01 NFR Designはcloud/service patternを追加せず、pure moduleのlogical componentとtest seamへNFRを割り当てる; U-01がI/O、state、networkを持たないため。
- 2026-07-13T17:18:55Z — U-02 NFR Designはaudit-first store、armed supervisor、lease/claim guard、reconcilerを分離し、既存referee/Bolt/worktree primitiveをclosed portとして利用する; lifecycleが永続化、process、Gitの異なるfailure domainを跨ぐため。
- 2026-07-13T17:28:27Z — U-03 NFR DesignはClaude C-05をpure plan/profile/parser/correlatorへ限定し、capture/process lifecycleをU-02、verdictをC-08、refereeをC-11へ残す; Agent Teams/Ultraのnative proofには独立state+stream sourceと明示ownershipが必要なため。
- 2026-07-13T17:34:22Z — U-04 NFR DesignはCodex C-06をsame-connection probe binding、runtime model guard、role/launch policy、JSONL/hook correlatorへ限定する; model alias/default、provider auth、native delegationを同じattemptへ機械的に束縛するため。
- 2026-07-13T17:39:56Z — U-05 NFR Designはbalanced wave planner、least-trust role/config plan、V2 session projector、wave envelope portへC-07を限定する; provider上限4とserial referee gateをUnit dropなしで両立するため。
- 2026-07-13T17:45:02Z — U-06 NFR Designはfixed manifest candidate、独立domain validator、coverage checker、single Issue publisher、immutable report sealerへclosure責務を分ける; same-tree provenanceとall-matchをprovider実装から独立して判定するため。
- 2026-07-14T11:16:17Z — 最新U-06 NFRを再消費し、candidate builderを総byte数込みのstreaming digester、live validatorをdriver別closed receipt variant、Issue portをpagination完全検索へ精緻化した。
- 2026-07-14T11:23:10Z — 最終architecture reviewのMajor 2件を受け、Ultra exact invocation proofとmanifest guard／Issue ensurerの単一ownerを設計へ追加した。
- 2026-07-14T11:25:40Z — 本stageはperformance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.mdを上流成果物として消費し、5つのNFR Design成果物へtraceした。

## Deviations

- 2026-07-13T17:10:48Z — stage例のcache、queue、circuit breaker、encryption、auto-scalingを非適用とした; 構成要素のないpatternを追加すると上流のpure boundaryと最小実装に反するため。
- 2026-07-13T17:18:55Z — U-02ではcache、queue、circuit breaker、database、cloud/IaC patternを非適用とした; local single-writer file protocolにremote infrastructureを加えるとfailure surfaceと二重実行riskが増えるため。
- 2026-07-13T17:28:27Z — U-03ではSDK/API client、queue、pool、cloud resourceを非適用とした; installed CLIのnative coordinationと既存authを証明するscopeであり、別transportはnative surfaceを変えるため。
- 2026-07-13T17:34:22Z — U-04ではSDK/Responses API、daemon、queue、cloud resourceを非適用とした; installed CLIのapp-server/exec/hookがauthoritative surfaceであり、別runtimeは証拠とauth境界を変えるため。
- 2026-07-13T17:39:56Z — U-05ではSDK/direct API、parallel wave、queue、cloud resourceを非適用とした; installed V2 CLI/session surfaceと4-child上限をserial balanced planで扱うscopeのため。
- 2026-07-13T17:45:02Z — U-06ではhosted release service、database、cache、queue、新GitHub SDKを非適用とした; fixed manifestとimmutable receiptでlocal/CI closureを決定的に検証できるため。
- 2026-07-14T11:16:17Z — なし。既存5成果物を最新NFR/Functional Designへ差分更新し、cloud/IaC component 0件と既存Bun/GitHub publisher境界を維持した。
- 2026-07-14T11:23:10Z — reviewer iteration上限2到達後にMajor 2件を是正した。追加iterationは行わず、是正後の全適用センサー再実行で閉包する。

## Tradeoffs

- 2026-07-13T17:10:48Z — cross-run cacheやwall-clock最適化よりpure recomputation、canonical ordering、operation-count verificationを選んだ; 決定性とcall間fault isolationを優先するため。
- 2026-07-13T17:18:55Z — 直接spawnや無条件retryよりidentity-first/one-time-armとdigest/postcondition reconciliationを選んだ; 少ない状態よりcrash後の副作用上限とstale writer排除を優先するため。
- 2026-07-13T17:28:27Z — permissive schema対応やroot scanよりversioned surface profile、exact path、profile不明時parkを選んだ; availabilityよりwrong-session adoptionとfalse native success 0件を優先するため。
- 2026-07-13T17:34:22Z — model slug固定やversion推測よりunpinned handshakeによるruntime exact resolutionとprofile不明時parkを選んだ; 将来追従性とfalse Ultra success 0件を両立するため。
- 2026-07-13T17:39:56Z — parallel waveやdynamic rebalanceより2〜4 balanced serial waveとC-08/C-11 dual-green gateを選んだ; throughputよりUnit全件性と未収束後続実行0件を優先するため。
- 2026-07-13T17:45:02Z — incremental partial receipt reuseよりinput変更ごとのnew candidate全再評価を選んだ; 実行時間よりsame-tree provenanceとfalse closed 0件を優先するため。
- 2026-07-14T11:16:17Z — Issue API call数最小化より結果集合完全性を優先し、全page取得と件数照合をsingle publisherの前後に要求した。
- 2026-07-14T11:23:10Z — generic transport variantだけでUltraを証明する簡潔さより、versioned invocation contractとcanonical argv digestの追加を選び、exact headless contractの弱化を防いだ。

## Open questions

- 2026-07-13T17:10:48Z — なし; infrastructure component 0件を含め、U-01のNFR design判断は上流で確定済み。
- 2026-07-13T17:18:55Z — なし; U-02のlease、heartbeat、single-writer、process portability、infrastructure非適用は上流で確定済み。
- 2026-07-13T17:28:27Z — なし; Ultra profileのfield pathはCode Generation entryのcredentialed discovery gateで確定し、確定不能ならparkする条件まで上流で決定済み。
- 2026-07-13T17:34:22Z — なし; Codex collaboration/hook/env isolationはCode Generation entryのcredentialed discoveryでprofile化し、実証不能ならU-04をparkする条件まで確定済み。
- 2026-07-13T17:39:56Z — なし; Kiro V2 parent relation/terminal/stdin profileはCode Generation entryで確定し、known-unavailableとunprofileable parkの分岐も上流で確定済み。
- 2026-07-13T17:45:02Z — なし; 6 domain、26 FR、2 platform、4 native live、Issue single-publisher、Windows対象外は上流で確定済み。
- 2026-07-14T11:16:17Z — なし。streaming hash、driver別receipt、Issue paginationの実装境界は承認済みNFRから一意に導出できる。
