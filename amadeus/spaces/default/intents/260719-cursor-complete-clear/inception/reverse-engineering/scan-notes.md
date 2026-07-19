# RE コードスキャンノート — 260719-cursor-complete-clear(Issue #1248)

- **手法**: diff-refresh(フルスキャン非実施)
- **測定 ref (observed)**: HEAD = `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git rev-parse HEAD` で実測)
- **base**: `591b6a2a2`(`git merge-base --is-ancestor 591b6a2a2 HEAD` → 祖先確認済み、`git rev-list --count 591b6a2a2..HEAD` = 52)
- **スキャン面**: `packages/framework/core/tools/`、`packages/framework/core/hooks/`、`tests/`
- すべての file:line は現 HEAD の実ファイル直読。推測なし。

---

## 1. 区間変更(591b6a2a2..HEAD)の交差判定

コマンド: `git log --oneline 591b6a2a2..HEAD -- packages/framework/core/tools/ packages/framework/core/hooks/ tests/`

区間コミット13件。各コミットについて、フォーカス面シンボル(`active-intent`/`ACTIVE_INTENT_POINTER`/`setActiveIntentCursor`/`handleCompleteWorkflow`/`updateIntentStatus`/`appendAuditEntry`/`auditFilePath`)への交差を `git show <sha> -- <focus files> | grep -icE ...` で機械計測 → **全13件が focus-hits=0**。

| sha | 要約 | 交差 |
|---|---|---|
| 6935a3695 | feat(election) Bolt 5 skill-wrap (#1236) | 非交差 |
| fdfe1ecd3 | feat(election) Bolt 4 cli-complete (#1235) | 非交差 |
| 773ded00a | feat(election) Bolt 3 io-record-transport (#1233) | 非交差 |
| 654e54b53 | feat(election) Bolt 2 model-complete (#1231) | 非交差 |
| cf92b6813 | feat(election) Bolt 1 walking-skeleton (#1227) | 非交差 |
| f28fe7ae9 | chore(release) v0.1.3 | 非交差 |
| bf84cdfaf | fix(codex) separate canonical and active hooks (#1212) | 非交差 |
| 2ecf7208f | fix(orchestrator) resume answers without advancing gates (#1208) | 非交差 |
| c0f144338 | docs(swarm) three-value driver contract (#1211) | 非交差 |
| 66dcbb0d9 | feat(swarm) three-value dispatch wiring (#1207) | 非交差 |
| 31ccba5a1 | feat(swarm) three-value AMADEUS_USE_SWARM resolution (#1204) | 非交差 |
| cd9865194 | fix(mirror) exclude scope-SKIP suffix rows (#1198) | 非交差 |
| d1bc8be26 | fix(state) set-status 後退書き込みを audit-lock ガードで抑止 (#1197) | 非交差(status/audit 隣接だが focus シンボル無変更) |

**結論**: base 以降、本 intent のフォーカス面(カーソルライフサイクル・complete 経路・監査追記チェーン・フック群)は一切変更されていない。欠陥は base 時点から現存し、区間内の再導入・退行はない。

---

## 2. フォーカス面の現状実測

### 2.1 active-intent カーソルのライフサイクル(`packages/framework/core/tools/amadeus-lib.ts`)

- `ACTIVE_INTENT_POINTER = "active-intent"` — **:400**(定数定義)
- カーソル**書き手は repo 全域で2箇所のみ**(`grep -rn ACTIVE_INTENT_POINTER`):
  - `setActiveIntentCursor(projectDir, dirName, space)` — **:1725-1733**、書込は **:1729**(`writeFileSync(join(dir, ACTIVE_INTENT_POINTER), ...)`)。best-effort(失敗を握りつぶす、per-user cursor)。
  - birth 時書込 — **:2147**(`writeFileSync(join(intentsRoot, ACTIVE_INTENT_POINTER), ...)`)。
- `setActiveIntentCursor` の呼び出し元(`grep -rn setActiveIntentCursor packages/framework/core/`):
  - `amadeus-lib.ts:1921`(intent 作成系ヘルパー内)
  - `amadeus-utility.ts:3083`(`/amadeus intent <name>` 切替、intent switch verb)
- **削除/クリア経路の不在確認**: `grep -rn "unlink|rmSync|rm(" packages/framework/core/tools/*.ts | grep -i "active|cursor|POINTER"` → **NONE**。カーソルを消す関数(`clearActiveIntent` 等)はコードベースに存在しない。
- 読み手 `activeIntent(projectDir, space, explicit)` — **:1059-1084**。カーソル解決は **:1069-1076**、判定は **:1074** の `if (records.includes(raw)) return raw;` のみ。**intents.json の status を一切参照しない** — record dir が実在する限り、Completed でもカーソル値をそのまま返す。

### 2.2 complete-workflow 経路(`packages/framework/core/tools/amadeus-state.ts`)

- `handleCompleteWorkflow(args)` — **:1550-1680**。
  - `Status: Completed` を state に設定、監査4行 emit(PHASE_COMPLETED/PHASE_VERIFIED/WORKFLOW_COMPLETED 等 :1636-1659)、`writeStateFile`(:1661)。
  - registry 前進: **:1668-1669** `const completedIntentDir = activeIntent(pd); if (completedIntentDir) updateIntentStatus(pd, completedIntentDir, "complete");`
  - **active-intent カーソルへの操作は経路全域で皆無**(:1550-1680 直読で確認)。status 前進のみで、カーソルは完了 intent を指したまま残留する。
- `updateIntentStatus(projectDir, dirName, status, space)` — `amadeus-lib.ts:1930-1954`。intents.json の該当行の `status` を書き換えるのみ(:1944)。カーソルには触れない。
  - **呼び出し元は全域で1箇所のみ**(`grep -rn updateIntentStatus packages/framework/core/`): `amadeus-state.ts:1669`(上記)。他に呼び出し元なし = 列挙完全。
- park/unpark: park は `amadeus-orchestrate.ts:3128 handlePark`。`grep -rn "handlePark|handleUnpark|parked" packages/framework/core/tools/*.ts` で確認した限り、park/unpark 経路にカーソルの set/clear は無い(park はディレクティブ状態のみ変更)。intent 切替(`amadeus-utility.ts:3083`)のみがカーソルを別 intent へ移動させる = 現状カーソルが完了 intent から離れる唯一の実手段。

### 2.3 監査追記チェーン(`packages/framework/core/tools/amadeus-audit.ts` / `amadeus-lib.ts`)

- `appendAuditEntry(eventType, fields, projectDir, intent?, space?)` — **:281**。event type 検証(:288)後 `appendAuditEntryUnlocked` へ委譲(:301)。
- `appendAuditEntryUnlocked(...)` — **:314**、`ensureAuditFile(projectDir, intent, space)` を呼ぶ — **:330**。
- `ensureAuditFile(...)` — **:237-247**。`auditFilePath`(:238)を解決し、**無条件で** dir 作成(:240-242)・ファイル作成(:243-245)・以後 append。**status 検査は無い**。
- `auditFilePath(projectDir, intent?, space?)` — `amadeus-lib.ts:2181-2185`。`recordDir(projectDir, intent, space)` を呼ぶ(:2182)→ `recordDir` は `activeIntent` に委譲(:1095)。
- **status ゲートの不在確認**: `appendAuditEntry`/`appendAuditEntryUnlocked`/`ensureAuditFile`/`auditFilePath`/`recordDir`/`activeIntent` の全段に status 参照が無い。よって完了 intent のカーソルが残る限り、監査は完了 intent の shard へ append され続ける(モグラ叩き機序)。

### 2.4 フック群(`packages/framework/core/hooks/`、全11フック)

`grep -nE "emitAudit|appendAuditEntry|activeIntent|recordDir|auditFilePath|HUMAN_TURN|SENSOR_FIRED" <each>` で監査到達経路を判定:

| フック | 監査追記到達 | 経路 |
|---|---|---|
| amadeus-mint-presence.ts | **到達(主犯)** | :73-74 ゲートは `existsSync(stateFilePath(projectDir))` のみ → `stateFilePath`(lib:2169-2173)→`recordDir`→`activeIntent`。毎ターン HUMAN_TURN を append(:74)。status ガード無し。 |
| amadeus-audit-logger.ts | **到達** | :10 import、:122 `appendAuditEntry`(ARTIFACT_CREATED/UPDATED)。ゲートは record-root パス一致+`hasActiveWorkflowAudit` のみ。 |
| amadeus-sensor-fire.ts | **到達(間接)** | dispatcher 経由で SENSOR_FIRED/SENSOR_PASSED を emit(:15, :124 コメント)。#1248 実測で完了後 262 発火。 |
| amadeus-session-start.ts | **到達** | :24 import、:127 `appendAuditEntry(SESSION_STARTED/RESUMED)`。:148 で `activeIntentUuid` 解決。 |
| amadeus-session-end.ts | **到達** | :9 import、:49 `appendAuditEntry("SESSION_ENDED", ...)`。 |
| amadeus-validate-state.ts | **到達** | :11 import、:65 `appendAuditEntry(SESSION_COMPACTED)`(PreCompact)。 |
| amadeus-log-subagent.ts | **到達** | :8 import、:66 `appendAuditEntry("SUBAGENT_COMPLETED", ...)`。 |
| amadeus-stop.ts | 参照のみ | :97 `auditFilePath` import、:212 で読み取り(`hasActiveWorkflowAudit` 判定)。追記はしない(読取専用)。 |
| amadeus-statusline.ts | 非到達 | :189 `activeIntent` を表示用に解決するのみ。追記なし。 |
| amadeus-runtime-compile.ts | 非到達 | 遷移級 audit emit を trigger に compile 実行。自身は追記しない(:27 `activeIntent` は判定用)。 |
| amadeus-sync-statusline.ts | 非到達 | 監査シンボル無し。 |

→ **追記到達フックは7つ**(mint-presence, audit-logger, sensor-fire, session-start, session-end, validate-state, log-subagent)。すべて共通末端 `appendAuditEntry`→`auditFilePath`→`activeIntent` を通り、status ガードが無いため完了 intent の shard を汚染する。

### 2.5 intents.json registry の status 語彙

- 書込語彙: `"in-flight"`(birth 時 `amadeus-lib.ts:1918`・`:2143`)、`"complete"`(`updateIntentStatus` 経由 `amadeus-state.ts:1669`)、reader fallback `"unknown"`(`amadeus-lib.ts:1714`)。park の `"parked"` 語彙は directive 層(`amadeus-directive.ts`)側で、registry status とは別軸。
- **`activeIntent` が registry status を参照しない事実**(2.1 再掲): `activeIntent`(:1059-1084)は `records.includes(raw)`(:1074)のみ。registry の `status` フィールドを読む箇所は `activeIntent` 内に無い = カーソル解決は status 非依存。

### 2.6 修正時の影響面

- **影響しうる既存テスト**(`grep -rl "active-intent\|activeIntent\|complete-workflow\|updateIntentStatus\|ACTIVE_INTENT_POINTER" tests/`、抜粋20):
  `tests/unit/t07-hook-audit-logger.test.ts`、`t33.test.ts`、`t76.test.ts`、`t169-session-resume-rebind.test.ts`、`t112-delegated-approval.test.ts`、`t213-orchestrate-parked-new-intent.test.ts`、`t219-audit-fork-reentrant-seam.test.ts`、`t-learnings-persist-seam.test.ts`、`t-delegate-answer-consume.test.ts`、`t157-workspace-shell-seed.test.ts`、`t182-codekb-placement.test.ts`、`t20/t17/t29/t31/t38/t125` ほか。
  特にカーソル clear を実装する場合は session-resume-rebind(t169)・parked-new-intent(t213)・audit-logger(t07)への回帰確認が必須。
- **dist 伝播面**(正本編集後の同期要件):
  - 正本 `packages/framework/core/tools/{amadeus-lib.ts, amadeus-state.ts, amadeus-audit.ts}` および `hooks/*.ts` を触ると、**6ハーネス dist ツリー**へ再生成が必要: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/.<harness>/tools/amadeus-lib.ts`(`find dist -name amadeus-lib.ts` で6件確認)。
  - **self-install `.claude/` ツリー**にも同ファイルのコピーが存在(`.claude/tools/amadeus-lib.ts` 実在)。
  - 同期コマンド: `bun scripts/package.ts`(dist 再生成)+ `bun run promote:self`(self-install 反映)、検証は `bun run dist:check` / `bun run promote:self:check`。project.md Mandated 準拠。

---

## 3. 既知の再現手順(Issue #1248 e3/e4 クロスレビューで CONFIRMED、回帰テスト設計の入力)

Issue #1248 本文の実測(2026-07-19):
- intent `260718-hooks-config-conflict` が 2026-07-18 に complete・record は main 着地済みだが、カーソルが同 intent を指したまま → 完了後の会話で shard `audit/j5ik2o-mac-studio-lan-d4a945003a7f.md` に **6,000行超**の完了後イベント蓄積(Sensor Fired 262 / Sensor Passed 256 / Human Turn 33)。
- record-sync PR を2本要した(#1246 +6,367行 / #1247 +12行)が、**PR で回収しても次のユーザーメッセージで再 dirty**(モグラ叩き)。
- **カーソルファイルを手動削除した時点で追記停止**(行数7,825で不変を実測確認)。

e3/e4 の scratch 再現(repo 外・`--project-dir`/`CLAUDE_PROJECT_DIR` override):
complete-workflow 実行後もカーソル残留 → mint-presence/sensor-fire 経由で HUMAN_TURN/SENSOR_FIRED 追記が成立 → カーソル削除で追記停止、が両レビュアーにより独立実証済み。

**回帰テスト設計の入力(seam)**:
1. `handleCompleteWorkflow` 実行後に active-intent カーソルが完了 intent を指さない(clear または不解決)ことを検査 — 修正案1(エンジン側 clear)の閉包。
2. または `appendAuditEntry`/`auditFilePath` 経路で、参照先 intent の registry status が `complete` のとき追記が no-op になることを検査 — 修正案2(フック側防御層)の閉包。in-process seam(`appendAuditEntry`/`activeIntent`/`updateIntentStatus` 直接呼び出し)でカバーし、spawn 盲点を避ける。
3. モグラ叩き閉包: complete → 追記トリガー(HUMAN_TURN 相当)→ shard 行数が増えないことを実測(元症状の非再現)。

## 対称ペア観点(symmetric-pair-review)

`setActiveIntentCursor`(set)に対する **clear の非対称**が本欠陥の核心。set は birth/switch の2経路で存在するが、complete(intent ライフサイクルの終端)に対応する clear が欠落 = 片側だけ実装された非対称。修正はこの対称性を補う方向(complete 時 clear、または status ゲートで解決を止める)。
