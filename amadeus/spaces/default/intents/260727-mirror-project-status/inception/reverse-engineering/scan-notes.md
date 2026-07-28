# RE スキャンノート — 260727-mirror-project-status(developer スキャン成果)

観測 ref: HEAD `cd937c991`(worktree issue-1560-project-status-sync)。差分 base: `3b87d1027`(祖先・距離16、cid:reverse-engineering:rescan-base-ancestry 準拠で機械選定)。

## 1. 区間差分の要約(3b87d1027..HEAD、16 コミット)

正本面コミットは4件のみ:

| SHA | 件名 | mirror 関連 |
|---|---|---|
| e038d67a1 | fix(mirror): manual-boundary ask への answer を解決・consume 可能にする (Refs #1548) (#1559) | ✅ lifecycle + coordinator |
| f8fe817c5 | feat(plugin): walking skeleton — engine relocation, plugin CLI, claude projection + auto-compose hook (Bolt 2, U2) (#1554) | ❌ plugin 系(新規 1,923行) |
| 82df115ae | fix(mirror): 状態表現の write⇔read 非対称を v1 ブロック権威へ統一 (Refs #1547, #1534) (#1553) | ✅ mirror.ts / codec / lifecycle / orchestrate |
| f1905d7cd | fix(promote-self): wire kimi hooks managed block on --apply and branch doctor repair hint for self-dev (#1549) | ❌ utility.ts の kimi doctor |

diffstat(core): 10 ファイル / +2,203 / -326。残り12コミットは record/metrics/gitignore。

主要変更:
- **82df115ae**: `mirrorIssueNumberFromDocument()` 新設(state-codec.ts:1355-1358、記録済み判定の唯一の導出定義)。orchestrate.ts :314/:3521 が legacy `Mirror Issue` フィールド読みから切替。amadeus-mirror.ts が -307/+76 で縮小(status 用並行レンダラ renderBody 等を削除、sync 側 canonical 1定義へ統合)。lifecycle.ts に `buildMirrorStatusRecordView()`(:284-315)、`markerCreateIdentity()`(:317-334)新設。
- **e038d67a1**: `runMirrorLifecycleAnswer` が manual boundary の answer で manualOperation/invocationId を再構成(lifecycle.ts:1052-1058)。coordinator に `consumeAnsweredPrompt()`(:565-596)新設 — reconcile 経路の binding 残留を消費。skippedOutcome の operationId 再利用(:371-378)。

## 2. mirror スタック現在地図(HEAD 直読、計 9,208行/16ファイル)

規模: state-codec 1536 / executor 1223 / lifecycle 1118 / gateway 760 / coordinator 754 / state-reducer 733 / state-store 428 / types 403 / config 411 / mirror.ts 357 / runner 306 / presentation 312 / repair 307 / provenance 246 / policy 226 / capability 88。

### gateway(C5)— GraphQL 追加時の seam
- argv ビルダー(:83-188): versionArgv/authArgv/createArgv/findArgv/viewArgv/editArgv/closeArgv。全て `gh api --include --method <VERB> <REST-path>` 形、パスは issuesPath()(:85)単一定義。FIND_PER_PAGE=100(:120)。
- envelope パーサー parseHttpEnvelope(stdout, mode:"single"|"array")(:224)。LF/CRLF 両受理(:208、gh 2.96.0 実測 #1498)。非2xx は :253-254 で http-error 短絡。
- エラー分類 classifyHttpStatus(:483-494): 429→rate-limit(retryable)/401→unauthenticated/403→permission/>=500→api(retryable)/他→api。processFailure(:499-515)。effectForOp(:451-454)。redactSummary(:456-465、生出力非転記)。
- 権限ゲート: 全 mutation は requireValidPermit(:617-628)、permit は capability.ts の module-private WeakSet のみが mint。
- runner profile 3値 version-auth|single|paginated、deadline 10s/30s/60s、stdout cap 1MiB/1MiB/64MiB(runner.ts:23-31)。
- **GraphQL は --method/REST パスを取らないため既存 argv ビルダーの延長では書けない**(新 argv 族+body 層の errors 解釈が必要 — GraphQL は HTTP 200 で errors を返しうる(推定))。

### config(C1)— 新設定の流儀
- 3層 LAYER_ORDER=["global","space","intent"](:37)、パス :280-287。読みは O_NOFOLLOW/realpath/size/fstat 検査の fail-closed(:183-206)。
- **closed schema**: classifyRawValue が `auto-mirror` 以外の key を拒否(:335-341)。新設定(対象 Project 指定・フェーズ Status 名上書き)は allowlist(:335)+MirrorConfig(:41)+MirrorConfigIssue.key(:50-66)+readFailure(:245-258)の4面同時更新が必要。VALID_MODES=off|prompt|auto(:36)。sources の意味論は単一キー前提(複数キー化で再設計が要る — 推定)。

### state 三層
- MirrorReceiptStatus(types.ts:61-68)= prepared|attempted|succeeded|skipped-for-event|pending|safety-blocked|abandoned(7値)— Issue の pending/safety-blocked 語彙は既存。
- codec: ROOT_KEYS closed set(:431-441)= schema,revision,issueNumber,provenance,receipts,warnings,repairChallenges,expectedPrompt,auditOutbox。checkUnknownKeys(:526)全数検査。canonical レンダラ renderMirrorStateJson(:1492)→renderMirrorStateBlock(:1517)→writeMirrorStateDocument(:1524)、読み parseMirrorStateDocument(:1301)。**Project item id 等の永続化は keys/validate/render の3面同時更新**。
- reducer: MirrorTransition 18種(:37-94)。MAX_RECEIPTS=1000。
- store: MirrorStateStorePorts 5メソッド(:66)。audit batch を state write より前に確定(:203-227、audit-batch-before-state-atomicity 実装面)。
- Issue 本文 canonical: renderMirrorIssueContent(presentation.ts:185-219)= 固定7セクション(Intent UUID/Summary/Phase/Stage/Status/Updated At/Mirror Marker)。読み side は sectionValue(mirror.ts:110-119)+compareMirrorStatus(:124-158)。

### lifecycle(C3)/ coordinator(C7)/ policy(C2)
- boundary 5種(types.ts:23-28): intent-capture-approved / phase-verified(phase)/ parked(stage)/ workflow-completed / manual。
- operationForBoundary(coordinator.ts:214-228): manual→null / intent-capture-approved→create / workflow-completed→nextCompletionOperation() / 他→issueNumber null?create:sync。
- APPLICABLE_OPERATIONS(policy.ts:45-53): intent-capture-approved:[create] / phase-verified:[create,sync] / parked:[create,sync] / workflow-completed:[create,sync,close] / manual:[create,sync,close]。
- nextCompletionOperation(policy.ts:204-225): create→sync→close を1操作ずつ前進。
- executor: executeMirrorOperation(:1203-1223)、executeLinked(:1094-1201)= view→verifyOwnership→completionGuardIssue→reconcile→prepare→mutateLinkedIssue(:1047-1092)。
- answer/binding: runMirrorLifecycleAnswer(:1012-1078)、approveMirrorPrompt(policy.ts:165-197、expectedPrompt 一致必須)、executionAuthorization(coordinator.ts:271-315)= auto|prompt-approved|manual、consumeAnsweredPrompt(coordinator.ts:572-596)。
- **repair status(lifecycle.ts:816-856)は6項目のみ**(intentDir/repository/revision/issueNumber/provenance/pendingOperations)— Project 連携の診断項目は現状ゼロ。

### 主要 union(types.ts)
MirrorMode(:13)=off|prompt|auto / MirrorOperation(:15)=**create|sync|close(3値に閉じている — 本 intent の設計分岐点: 第4 operation か sync 内部ステップか。receipt key(policy.ts:81-94 の位置固定 tuple)/permit/APPLICABLE_OPERATIONS/nextCompletionOperation/codec OPERATIONS(state-codec.ts:83)の5面連動)** / MirrorFailureClass 14種(:45-59) / MirrorOperationOutcome 6種(:359-378) / MirrorDecision(:390-403)=suppress|prompt|execute。
C0 ヘッダ(:8-11)は「PR merge/release/publish/deploy を足せる外部アクション union へ一般化しない」と明記。

## 3. lifecycle phase の取得 seam

- **唯一の seam**: lifecycleSnapshot()(lifecycle.ts:244-258)の state file 直読 — `getField(stateContent,"Lifecycle Phase")`(:252)。型 MirrorSnapshot(types.ts:309-318、8フィールド)。
- boundary の phase-verified.phase は**前フェーズ**(orchestrate.ts:205-232 PREVIOUS_BOUNDARY_BY_PHASE)であり現在フェーズに流用不可。MIRROR_BOUNDARY_PHASES(amadeus-state.ts:198-202)= ideation|inception|construction の3値のみ。
- mirrorEventKey(policy.ts:81-94)は boundary.kind+instance のみ(phase/stage は意図的除外 :67-69)。
- **Parked を mirror は読んでいない**(grep 0 hit。82df115ae で旧読み手削除)。registryStatus(IntentStatus、amadeus-lib.ts:1759-1764、値 parked あり)だけが MirrorSnapshot に届く(types.ts:316)。landingEvidence(coordinator.ts:250-258)は registryStatus==="complete" && status==="Completed"。→ parked 維持の実装は registryStatus 判定か Parked フィールド読み復活かの設計判断(推定)。
- PHASES 正準集合(amadeus-lib.ts:149-155)= initialization|ideation|inception|construction|operation(5値)。state には大文字化書込(amadeus-state.ts:1880)。完了は Status: Completed(amadeus-lib.ts:4279)。

## 4. テスト現状

- mirror 系31ファイル: unit 15(t232/t257/t258/t268/t270/t271/t272(714行)/t274/t275/t276/t277/t279(686行)/t280(529行)/t281/t283/t285)、integration 13(t232/t257/t258/t268/t269/t273/t278/t282(1,288行)/t284/t287/t289/t291/t292/t300(288行、write⇔read regression))、e2e 2(t258-dist/t293)。
- seam 様式: gateway=fake MirrorProcessRunner+envelope 独立 golden(gh 2.96.0 od -c 実測 verbatim、t272:59-81)/ executor・coordinator=FakeGateway+memoryStore(t279:53-110)/ lifecycle=real fs+MirrorLifecycleRuntime 注入(t282, t300)/ config=純関数直叩き(t257)。
- **閉じた台帳**(手動同期必須): MIRROR_TOOL_FILES 16(projections.ts:22-39、t285:61-62 が wrapper toHaveLength(15) 固定)/ MIRROR_SURFACE_IDS 7 / MIRROR_DOC_PROJECTIONS 4 / docs TOPICS 8種×4文書(mirror-docs-contract.ts:15-24、t287)/ MIRROR_USER_CONTRACT(presentation.ts:16-128、scopeExclusions=["pull-request","release","deploy","daemon","polling"] :127、t291 parity)。

## 5. 技術スタック・依存の区間変化

- 変化なし(package.json/bun.lock 区間 diff ゼロ、実測)。
- **GraphQL 関連の実装コードは repo に皆無**(grep 全域6 hit は docs/agent 記述のみ)→ 本 intent が framework 初の GraphQL 経路(実測確定)。

## 6. 新機能に効く構造上の要点

確定(実測): (1) gh 呼出しは gateway 1モジュールに閉じる (2) MirrorOperation 3値と5面連動 (3) config closed schema 4面 (4) state ROOT_KEYS closed 3面 (5) フェーズ seam は lifecycleSnapshot のみ (6) Parked 未読(registryStatus のみ) (7) 配布台帳 t285 手動同期 (8) GraphQL repo 初。
推定(ラベル付き): GraphQL errors は HTTP 200 で返るため body 層の失敗分類が必要 / envelope golden は od -c capture 様式踏襲 / MirrorGitHubGateway 拡張は FakeGateway 3箇所全数更新。(訂正 2026-07-27 application-design レビュー実測: interface 実装クラスは t279/t282/t284/t300 の4箇所+t280 は型キャスト — 「3箇所」は過小だった)
