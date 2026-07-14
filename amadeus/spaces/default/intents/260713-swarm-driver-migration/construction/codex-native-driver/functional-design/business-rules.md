# Codex Native Driver ビジネスルール

## 上流トレーサビリティ

本成果物は`unit-of-work.md`のU-04、`unit-of-work-story-map.md`のUltra／fallback／legacy／resume slice、`requirements.md`のFR-05〜FR-06、FR-13、FR-15、FR-19、FR-23、NFR-02、NFR-04、NFR-11を具体化する。`components.md`のC-06/C-08、`component-methods.md`のadapter/evidence contract、`services.md`のCodex process/hook contractを制約として扱う。

## Registrationとprobe

| ID | ルール | 違反時 |
|---|---|---|
| CXR-01 | generic `DriverAdapterSet`のCodex providerは`codex-ultra` viewをexactly 1件持ち、keyと`adapter.driver`を一致させる | production registry起動拒否 |
| CXR-02 | Codex adapterは他provider slot、selector順序、driver literalを変更しない | build/test failure |
| CXR-03 | probeは同一resolve scopeで1回だけ実行し、attempt外cacheを作らない | `capability-probe-failed` |
| CXR-04 | CLI 5秒、app-server/config 5秒、catalog/auth/hook各10秒、behavior handshake 30秒、総45秒を上限とする | candidate unavailable |
| CXR-05 | CLI version、feature flag、config parser受理だけでavailableにしない | `native-surface-unavailable` |
| CXR-06 | app-server `model/list` snapshotをProbeBinding seedへ固定し、handshake SessionStartのexact model rowにliteral `ultra`が必要である | `capability-probe-failed` |
| CXR-07 | `config/read`はinvocation override後にeffort=`ultra`でなければならない | `NATIVE_MODE_NOT_CONFIRMED` |
| CXR-08 | alias/default handshakeはmodelをpinせず同じconfig/overrideで実行し、SessionStartのexact modelをcatalogへ照合する | `native-evidence-unavailable` |
| CXR-08a | resolve scope/nonceで同じapp-server response setを束縛し、CLI/cwd/provider/request/override/hook/catalogからProbeBinding seedをsealしてhandshakeへ渡し、resolved row/sessionを加えたfinal bindingを本runへ渡す | binding failure |
| CXR-08b | 本runは`--model <exact-id>`へpinし、actual SessionStartのmodel、seed/final binding、nonce一致までmode-confirmedを出さない | `NATIVE_MODE_NOT_CONFIRMED` |
| CXR-09 | model display name、prefix、説明文、`max`、`xhigh`をUltra capabilityへ読み替えない | probe failure |
| CXR-10 | model slugを実装定数にせず、mode identifierへruntime resolved IDを含める | architecture failure |
| CXR-11 | auth metadataはclassだけを保持し、email、account、token、endpoint headerを即時破棄する | confidentiality failure |
| CXR-12 | 明示driverのprobe失敗はhard error、`auto`だけがdispatch前fallbackできる | worktree/worker 0件 |

## Role、launch、process

| ID | ルール | 違反時 |
|---|---|---|
| CXR-13 | native対象batchは2 Unit以上で、Unitごとに一意なassignment tokenとattempt固有agent roleを1件作る | input rejection |
| CXR-14 | role名は`amadeus_u_<token>`のclosed形式とし、Unit-role-worktreeを全単射にする | launch拒否 |
| CXR-15 | role configはframework同梱generic workerを共有し、model/effortをpinせずparent Ultra設定を継承する | config rejection |
| CXR-16 | role file/configへUnit slug、worktree path、prompt本文を永続化しない | confidentiality failure |
| CXR-17 | batchごとに`codex exec --json` coordinatorをexactly 1 process起動する | native topology failure |
| CXR-18 | launchは`--model <resolved>`、`model_reasoning_effort="ultra"`、`features.multi_agent=true`を明示する | mode evidence failure |
| CXR-19 | 存在しない`--ultra`、`xhigh`代替、Unit別複数parent processをnative launchへ含めない | launch拒否 |
| CXR-20 | `--ephemeral`を使い、provider session rolloutをdriverの永続正本にしない | privacy failure |
| CXR-21 | manifest/promptはstdinへ1回だけwriteし、必ずEOFを送る | `COORDINATOR_FAILED` |
| CXR-22 | shell commandを組み立てず、executableとargvを分離する | security failure |
| CXR-23 | `--add-dir`集合はC-11 prepared Unit worktree集合とexact matchする | launch拒否 |
| CXR-24 | main checkout、prepared外path、symlink escapeをwrite targetにしない | failed-resumable |
| CXR-25 | provider/hook envとmodel-tool envを分離し、tool側は`shell_environment_policy.inherit="none"`からsafe PATH/scratch HOME/localeだけを構築する | launch拒否 |
| CXR-25a | model tool/subagent shellへauth、実HOME/CODEX_HOME、evidence root、capture/binding/nonce/owner、TMPDIRを渡さない | security failure |
| CXR-25b | evidence rootはcwd、Unit worktree、scratch HOME、全add-dir、sandbox tempの外とし、model toolのread/write/listを拒否する | pre-dispatch unavailable |
| CXR-26 | U-02のwrapper identity、checkpoint、one-time arm、process groupを使い、C-06独自supervisorを作らない | architecture violation |

## Captureとhook

| ID | ルール | 違反時 |
|---|---|---|
| CXR-27 | capture rootはattempt専用exact path、0700、owner marker 0600で作り、5 correlation keyとrealpath confinementを検証する | provider process 0件 |
| CXR-27a | captureはU-02の`hook-only` variantを使い、provider-state binding、resolver、`capture-bound`を持たない | architecture violation |
| CXR-28 | pure `prepareResources`でroot/owner/scratchをU-02の`AuxiliaryResourcePlan[]`として宣言し、materialized setを受けるpure `buildExecution`で同一resource digestのenv/capture planを作る。capture identity/plan/resource/ProbeBinding/tool-env/sandbox digestをaudit-first checkpointした後だけproviderをarmする | success禁止 |
| CXR-29 | required hookはSessionStart、SubagentStart、SubagentStopである | `native-evidence-unavailable` |
| CXR-30 | `--dangerously-bypass-hook-trust`を使わず、versioned `hooks/list` profileで3 exact definition hashのtrusted/enabledを確認する | preflight failure |
| CXR-31 | 5 correlation keyが完全かつowner markerのcapture/binding/nonce/ownerが一致する場合だけswarm recordを書く | hook record拒否 |
| CXR-31a | static hookが5 keyを継承でき、model toolが同keyを観測不能であることをbehavior/malicious sentinelで実証する | profile unavailable |
| CXR-32 | SessionStartはsession/model、Subagent hooksはsession/turn/agent ID/type/modelだけをallowlistする | schema rejection |
| CXR-33 | `agent_transcript_path`、`last_assistant_message`、prompt、tool resultを読取・保存しない | confidentiality failure |
| CXR-34 | event recordはraw IDをfilenameへ使わず、hash付きexclusive temp + fsync + atomic renameで作る | hook failure |
| CXR-35 | 同じevent/agentの重複recordを上書きせずduplicateとして拒否する | evidence failure |
| CXR-36 | provider group terminal後に全hook childをwaitし、captureをsealしてからnormalizationする | success禁止 |
| CXR-37 | unknown file、symlink、owner不一致、join timeoutを無視しない | failed-resumable |
| CXR-37a | terminal/capture join後はU-02がowned resourceだけをcleanupし、既存・別attempt resourceを削除しない | failed-resumable |

## Evidenceとverdict

| ID | ルール | 違反時 |
|---|---|---|
| CXR-38 | model proofは同じProbeBindingのcatalog Ultra、effective effort Ultra、handshake/actual SessionStart exact modelのANDである | `NATIVE_MODE_NOT_CONFIRMED` |
| CXR-39 | JSONL `thread.started.thread_id`はexactly 1件で、collab senderと全hook `session_id`に一致する | correlation failure |
| CXR-40 | expected roleごとにSubagentStart/Stopとterminal collaboration child stateをexactly 1件ずつ要求する | child incomplete |
| CXR-41 | expected Unit数 = role数 = distinct child ID数で、2件以上である | child count failure |
| CXR-42 | Unit-role-childは全単射で、未知role、余分child、重複Unit、child再割当を認めない | binding mismatch |
| CXR-43 | SubagentStopだけでcompletedにせず、公式`collabToolCall`意味へprofile投影したspawn/wait系collaboration itemのreceiver child、tool status completed、`agentsStates[child].status=completed`、hook ID/roleのANDを要求する | child incomplete |
| CXR-44 | collab prompt/agent-state message、JSONL agent message、reasoning、plan、command、file change、MCP本文をnative proofにしない | evidence rejection |
| CXR-45 | process exit 0、turn completed、capture sealedの全条件を要求する | coordinator failure |
| CXR-46 | normalized eventはID、enum、digest、Unit、closed collab statusだけを持ち、raw provider payloadを持たない | schema rejection |
| CXR-46a | C-08はnative lifecycle/Unit-role-childだけを判定し、worktree成果・protected spec・収束を入力にしない | architecture failure |
| CXR-47 | unknown JSONL itemは保存せず件数だけ診断し、required eventの代替にしない | post-dispatch failure |

## Failure、resume、referee

| ID | ルール | 違反時 |
|---|---|---|
| CXR-48 | provider arm後のprocess/hook/model/thread/child failureから別driver/floorへfallbackしない | failed-resumable |
| CXR-49 | crash時は旧provider/hook groupの停止とcapture joinを証明してからtakeoverする | `ATTEMPT_LIVENESS_UNKNOWN` |
| CXR-50 | resumeは同じexecution ID、新attempt ID/nonce/role/captureでprobeから再開する | resume拒否 |
| CXR-51 | 旧thread、agent ID、hook record、raw streamを新attemptへ再利用しない | correlation failure |
| CXR-52 | refereeが確定済みのconverged resultだけを再利用し、未完了Unitを成功扱いしない | resume拒否 |
| CXR-53 | evidence verified後もC-11 `check`と二相`finalize`がgreenになるまでsuccessを出さない | terminal success禁止 |
| CXR-54 | C-01とC-11は相互import/callせず、harness conductorだけが両CLIを媒介する | architecture failure |
| CXR-55 | main/担当外worktree変更、protected spec違反、lying conductorをC-11で拒否する | finalize failure |
| CXR-56 | Code Generation entryのcredentialed handshakeが成立しなければU-04をparkし、Intent scopeへ戻す | floor alias禁止 |

## Compatibilityと検証

| ID | ルール | 違反時 |
|---|---|---|
| CXR-57 | `AMADEUS_USE_SWARM=1`のCodex 0.1.x pathは`codex-exec-floor` + `SWARM_DEGRADED`として維持する | compatibility failure |
| CXR-58 | legacy floorを新しい`codex-ultra` native successへ読み替えない | audit failure |
| CXR-59 | deterministic suiteはfake app-server/exec/hookをproduction C-01/registry経由で使う | acceptance failure |
| CXR-60 | fake suiteはxhigh-only、catalog欠落、hook untrusted、probe seed/final/nonce/model/thread不一致、collab errored/interrupted、child不足/余分、EOF failure、crashを含む | coverage failure |
| CXR-61 | security fixtureでcredential、prompt、assistant message、transcript、raw responseの永続出力を0件にし、悪意あるmodel toolのenv/evidence root accessを拒否する | test failure |
| CXR-62 | macOS live proofは2 Unit以上、runtime-resolved Ultra model、native child、Unit成果、check/finalizeを必須にする | release failure |
| CXR-63 | auth不足、skip、unknown schema、hook未trustedをlive passへ読み替えない | release failure |
| CXR-64 | Linuxはfake/failure/package検証、Windowsは対象外とし、未検証の対応表現を追加しない | release contract failure |

## Decision table

| Catalog Ultra | Effective effort | Hook sentinel | Native children | 結果 |
|---|---|---|---|---|
| なし | 任意 | 任意 | 0 | pre-dispatch unavailable |
| あり | xhigh/max | 任意 | 任意 | mode not confirmed |
| あり | ultra | 失敗/未trusted | 0 | evidence surface unavailable |
| あり | ultra | 成功 | 0〜1 | post-dispatch child shortage |
| あり | ultra | 成功 | 2以上だがbinding/collab不一致 | post-dispatch correlation failure |
| あり | ultra | 成功 | 全Unitと全単射、全collab/hook terminal成功 | C-11 checkへ進む |

明示`codex-ultra`のpre-dispatch failureはhard errorである。`auto`だけがpre-dispatch unavailableをfloorへ変換できる。C-11 failureはnative evidenceが正しくてもbatch successにはならない。
