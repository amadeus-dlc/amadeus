# Swarm Execution Lifecycle ビジネスルール

## 上流トレーサビリティ

本ルールは`unit-of-work.md`のU-02責務、`unit-of-work-story-map.md`の共通lifecycle/USR-10、`requirements.md`のFR-05〜FR-06・FR-15・FR-18〜FR-22、`components.md`のC-01/C-04/C-08〜C-11、`component-methods.md`のstate/transition/envelope contract、`services.md`のorchestration/recovery順序を具体化する。

## Resolveとregistry

| ID | ルール | 違反時 |
|---|---|---|
| BR-01 | resolveはmulti-Unit、正batch、重複なしUnit、manifest内topologyを副作用前に検証する | typed input error、side effect 0 |
| BR-02 | behavior probeはmaterialized `probing` checkpointの後、batch/attemptごとに関連候補を1回だけ検査し、batch外cacheを使わない | planを作らない |
| BR-03 | 明示driverのprobe failureはhard errorで、attemptを`failed-terminal`にし、別driver/floor/worktree/workerを0件にする | terminal resolve error |
| BR-04 | `auto`だけがdispatch前にU-01の固定候補列へfallbackできる | contract error |
| BR-05 | production registryは3 provider moduleのstatic importと4 driverのexhaustive mappingだけを使う | startup contract error |
| BR-06 | provider未実装slotは`unavailable`を返し、no-op native successへ変換しない | explicitはhard error、autoは既定fallback |
| BR-07 | fake registration injectionはU-02のunit/integration testだけに許可する | production build/test failure |

## Prepared、dispatch、evidence

| ID | ルール | 違反時 |
|---|---|---|
| BR-08 | PreparedUnitはplan Unitと全単射で、worktree/repo/ownership/base bindingが一致する | `failed-terminal` |
| BR-09 | native run ID、wave digest、identity/arm pathを`prepared`へ保存してからwrapperをspawnし、wrapper実identityを`dispatched`へ保存してからarmする | dispatch禁止 |
| BR-10 | wrapperはattempt専用groupでidentityをatomic保存し、durable checkpointへ束縛されたone-time armだけでproviderを起動する。armなしではlease期限までに自己終了する | `PERSISTENCE_FAILED` |
| BR-11 | LaunchSpecはexecutable/argv/env/cwd/stdinを分離し、shell commandを組み立てない | launch拒否 |
| BR-12 | native eventはadapterでnormalized unionへ変換し、生payloadを共通runtimeへ渡さない | event拒否 |
| BR-13 | driver/attempt/nonce/plan/waveの相関は全eventでexact matchする | evidence failure |
| BR-14 | provider別の独立source集合、mode、marker、coordinator exit 0をANDで要求する | evidence failure |
| BR-15 | Unit-child binding、start、completed stopはwave Unitと全単射である | evidence failure |
| BR-16 | dispatch後のprocess/evidence/child failureから別driverやfloorへfallbackしない | `failed-resumable` |
| BR-17 | floor/legacyはnative evidenceを要求しないが、planと全Unit結果の全単射を要求する | result記録拒否 |
| BR-18 | floor/legacyをnative mode、native marker、native successへ読み替えない | contract error |

## Checkpointと監査

| ID | ルール | 検証 |
|---|---|---|
| BR-19 | checkpoint pathは`<record>/.amadeus-swarm-driver/batch-<n>.json`の1件だけを正本にする | path fixture |
| BR-20 | state transitionはclosed edge、pre/post digest、transition IDを持つ | exhaustive transition test |
| BR-21 | 通常transitionは同じaudit lock内でaudit intentを先にappendし、checkpointをatomic replaceする | planted write failure |
| BR-22 | 初回beginは`preDigest=ABSENT`、begin ID、intended post digest、probe pendingを`SWARM_DRIVER_ATTEMPTED`へ記録し、checkpointなしのorphanだけをside effect不在確認後に1回abandonする | begin failure injection |
| BR-23 | audit成功/checkpoint失敗を成功扱いせず、通常transitionはdigest一致時だけreapplyし、begin/selected eventはexecution/attempt/event/transition keyでdedupeする | reconciliation test |
| BR-24 | heartbeat更新はlease ID/fencing tokenのCASを通し、semantic state digestを変えない | concurrency test |
| BR-25 | audit/checkpoint/schemaへ未知fieldまたはsecret-like fieldを保存しない | planted secret test |

## Leaseとcrash recovery

| ID | ルール | 違反時 |
|---|---|---|
| BR-26 | lease 30秒、heartbeat 5秒を固定し、変更用のenv/flagを公開しない | named constant test |
| BR-27 | stale leaseだけでactive attemptを奪取せず、ownerのPID/start identity非生存も証明する | `ATTEMPT_LIVENESS_UNKNOWN` |
| BR-28 | recovery claimはaudit lock内でfencing tokenを1増加させ、旧writerを無効化する | claim失敗 |
| BR-29 | orphan groupはrun ID、PID、start tokenがcheckpoint/identity fileと一致する場合だけ終了する。identity未出現をprocess不在と推測しない | group操作せず停止 |
| BR-30 | wrapper identity出現またはarmなし期限終了を実測し、該当groupの終了とexitを確認する前に新attemptを開始しない | resume拒否 |
| BR-31 | resumeは同じexecution ID、新attempt/nonce/lease、必須previous attempt IDを使い、selection inputだけを引き継いだpre-probe `probing`から再開する | contract error |
| BR-32 | referee再検証済みUnitだけを再利用し、probe/provider session/未完了childを再利用しない | pendingへ戻す |
| BR-33 | `succeeded`と`failed-terminal`をresumeしない | terminal error |

## Refereeとterminal state

| ID | ルール | 違反時 |
|---|---|---|
| BR-34 | check loop後、既存`record-finalize`のrequest相がexpected/claimed/declined reason、check/protected spec、repo/base/target、target/strategy/message、全Unit worktree/head、plan/worktree、request/claim/progress/result pathをcanonical request digestとしてcheckpointへ束縛する | finalize禁止 |
| BR-35 | referee `finalize`は副作用前にrequest recordをcreate-if-absentし、同じaudit lockでowner process、固定30秒lease/5秒heartbeat、fencingを持つclaimをCAS取得する。live ownerがいれば同一requestでもloser副作用0で拒否する | terminal bindingまたはactive-claim error |
| BR-36 | referee envelopeはexecution/attempt/invocation/batch/finalize request digest、UnitごとのAIDLC merge digest、strategy別code merge outcomeを持つ | schema error |
| BR-37 | claimed全Unitをmerge前に再検証した後、slug順に`release-merge → amadeus-bolt complete --merge → amadeus-worktree merge(bound target/strategy) → Unit audit`を実行する | 順序違反はsuccess 0件 |
| BR-38 | 各primitiveはidentity-first/one-time-arm supervisorで起動し、operation ID/fencing/pre-stateを受ける。takeoverは旧wrapper/child group停止後だけ許し、各不可逆substep直前にcurrent claimをCAS再検証する | 矛盾時fail-closed |
| BR-39 | 同一invocation再実行はclaim回収後、progressのcanonical Unit prefixを再検証し、AIDLC統合、code merge、cleanup、Unit auditの完了stepを二重実行しない。prefix外commitは拒否する | resumable/terminal failure |
| BR-40 | successは全expected Unitのreferee green、AIDLC state/audit/runtime統合、code merge、Unit audit、request/result digest一致のANDである | success 0件 |
| BR-41 | check/process/finalize/claim/AIDLC merge/code merge/referee audit failureは`failed-resumable`へ写像する | typed failure |
| BR-42 | protected specはprepared共通baseのgit blobをbaselineとし、target-before blob、各UnitのHEAD blob、working-tree fileをすべて比較する。protected spec、lying conductor、batch/request binding、envelope schema、progress prefix違反は`failed-terminal`へ写像する | typed failure |
| BR-43 | 未知referee codeをresumable/successへ推測しない | parse拒否 |
| BR-44 | merge結果確定前またはdriver checkpoint materialization前にbatch/Intent successを返さない | success 0件 |

## Invariantと禁止事項

1. engine、driver coordinator、referee間に循環呼出しを作らず、conductorが媒介する。
2. selector、provider raw parser、referee convergence判定をU-02内で再実装しない。
3. C-01とC-11は互いをimport/invokeせず、conductorが`record-finalize(request) → referee finalize → record-finalize(result)`を媒介する。
4. 要求済み0.1.x legacy以外の互換shim、旧API alias、二重実装、未定義fallbackを追加しない。
5. provider credential、prompt、raw response、command全文、生hostnameを保存しない。
6. worker success claimだけでUnitをconvergedにしない。
7. begin/transition auditをterminal success eventとして解釈しない。materialized checkpointとrequest-bound referee envelopeを必要とする。
8. macOS/Linuxでlivenessを実測し、Windows対応や未検証成功を表明しない。
9. C-11のrequest/claim/progressはidempotency専用であり、retry判断、iteration cap、driver selectionを持たない。
10. worker後のHEADや複数workerの一致をprotected spec baselineとして信頼しない。

## Scenario別の受入

| Scenario | U-02の受入結果 |
|---|---|
| USR-01〜USR-05 | selection planをprepared worktree、execution/attempt、native evidence、refereeへ相関する |
| USR-06/USR-09 | env/harness入力のhard errorではattempt/worker/worktree 0件。probe failureではfailed-terminal attempt 1件、worker/worktree/floor 0件 |
| USR-07 | autoのdispatch前fallbackをloudに記録し、floor結果をrefereeへ渡す |
| USR-08 | legacyを独立modeで記録し、新driverへaliasしない |
| USR-10 | stale ownerとunarmed wrapper/orphan groupを実測回収し、新attemptで旧selectionを持たずprobeから再開する |
