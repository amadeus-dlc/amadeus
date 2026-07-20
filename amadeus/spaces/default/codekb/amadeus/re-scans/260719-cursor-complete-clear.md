# Re-scan 記録 — 260719-cursor-complete-clear(Issue #1248)

## 実行メタデータ

- **Date**: 2026-07-19(Asia/Tokyo)
- **Intent**: `260719-cursor-complete-clear`([Issue #1248](https://github.com/amadeus-dlc/amadeus/issues/1248) — intent 完了後の active-intent カーソル残留により、完了済み intent のシャードへ無期限に監査追記が続く(モグラ叩き))
- **Scope**: `bugfix`
- **Project type**: Brownfield
- **Repository**: `amadeus`
- **Stage**: `reverse-engineering`(2.1)
- **手法**: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。既存 CodeKB のフルスキャンは行わない。
- **実施体制**: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)。Architect が同一 ref・コマンドで独立再照合し、重大な反証はなかった。

## Base / Observed

- **base**: `591b6a2a222357f41061128f1b5a93c7f7a877be`(短縮 `591b6a2a2`)
  - `git merge-base --is-ancestor 591b6a2a2 HEAD` → exit 0(祖先性実測)。
  - `git rev-list --count 591b6a2a2..HEAD` → **52**。
  - 全 `re-scans/*.md` の observed のうち HEAD 祖先かつ距離最小を採用(cid:reverse-engineering:rescan-base-ancestry)。`591b6a2a2` は 260717-state-mirror-fixes の observed に一致する。日付が新しくても squash マージで feature tip が HEAD の非祖先になる observed(`c2e4975ff` = 260718-election-ts-foundation、`594ba21d…` = 260718-hooks-config-conflict 等)は `--is-ancestor` exit 1 につき base 候補から除外した。
- **observed**: HEAD `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git rev-parse HEAD` 実測)。
- **測定 ref**: 件数・行番号はすべて observed HEAD `a326f47bc` の実ファイル直読(cid:measurement-ref-in-artifacts)。区間サマリのみ `git log 591b6a2a2..HEAD` を用いる。
- **Base の真実源**: 本ファイルおよび `inception/reverse-engineering/scan-notes.md` の到達可能な Observed commit。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## Focus と測定方法

対象は Issue #1248 のフォーカス面である。

1. **active-intent カーソルのライフサイクル**: 書き手・読み手・clear 経路の全数実測(`ACTIVE_INTENT_POINTER`/`setActiveIntentCursor` の repo 全域 grep)。set⇔clear の対称性(symmetric-pair-review)。
2. **complete-workflow 経路**: `handleCompleteWorkflow` にカーソル操作があるか、status 前進のみか。
3. **監査追記チェーン**: `appendAuditEntry`→`ensureAuditFile`→`auditFilePath`→`recordDir`→`activeIntent` の全段に status ゲートがあるか。
4. **フック群**: 完了 intent の shard へ追記到達するフックの列挙。

## 区間交差判定(591b6a2a2..HEAD、13コミット / focus ファイル)

`git log --oneline 591b6a2a2..HEAD -- packages/framework/core/tools/ packages/framework/core/hooks/ tests/` は13コミット。各コミットのフォーカスシンボル(`active-intent`/`ACTIVE_INTENT_POINTER`/`setActiveIntentCursor`/`handleCompleteWorkflow`/`updateIntentStatus`/`appendAuditEntry`/`auditFilePath`)への交差を `git show <sha> -- <focus files> | grep -icE ...` で機械計測 → **全13件が focus-hits=0**。区間の大宗は election TS 基盤 Bolt(#1227〜#1236)・swarm 三値化(#1204/#1207/#1211)・codex hooks 分離(#1212)で、いずれもフォーカス面と非交差。**欠陥は base 時点から現存し、区間内の再導入・退行はない**。

## 主要発見の要約(実測、機序確定)

### カーソルの set⇔clear 非対称(欠陥の核心)

- `ACTIVE_INTENT_POINTER = "active-intent"` — `amadeus-lib.ts:400`。
- **書き手は repo 全域で2箇所のみ**(`grep -rn ACTIVE_INTENT_POINTER`):
  - `setActiveIntentCursor`(`amadeus-lib.ts:1725-1733`、書込 `:1729`)。best-effort(失敗を握りつぶす per-user cursor)。呼び出し元は intent 作成系ヘルパー(`amadeus-lib.ts:1921`)と intent 切替 verb(`amadeus-utility.ts:3083`)。
  - birth 時書込(`amadeus-lib.ts:2147`)。
- **削除/クリア経路は不在**: `grep` でカーソルを消す関数(`clearActiveIntent` 等)はコードベースに存在しない。set は birth/switch の2経路で存在するが、intent ライフサイクルの終端(complete)に対応する clear が欠落 = **片側だけ実装された非対称**(cid:requirements-analysis:symmetric-pair-review の典型クラスタ)。

### complete-workflow 経路にカーソル操作なし

- `handleCompleteWorkflow(args)`(`amadeus-state.ts:1550-1680`)は `Status: Completed` 設定・監査4行 emit・`writeStateFile` の後、registry 前進のみ(`:1668-1669` `updateIntentStatus(pd, completedIntentDir, "complete")`)。**カーソルへの操作は経路全域で皆無**(直読確認)。status を前進させるだけで、カーソルは完了 intent を指したまま残留する。
- `updateIntentStatus`(`amadeus-lib.ts:1930-1954`)は intents.json の該当行 `status` を書き換えるのみ(`:1944`)。呼び出し元は全域で `amadeus-state.ts:1669` の1箇所のみ(列挙完全)。

### 監査追記チェーンに status ゲートなし

- `appendAuditEntry`(`amadeus-audit.ts:281`)→ `appendAuditEntryUnlocked`(`:314`)→ `ensureAuditFile`(`:237-247`)。`ensureAuditFile` は `auditFilePath`(`:238`)を解決し **無条件で** dir/ファイルを作成・append する(status 検査なし)。
- `auditFilePath`(`amadeus-lib.ts:2181-2185`)→ `recordDir`(`:1095`)→ `activeIntent`(`:1059-1084`)。
- `activeIntent` の判定は `:1074` の `if (records.includes(raw)) return raw;` のみ = **intents.json の status を一切参照しない**。record dir が実在する限り Completed でもカーソル値をそのまま返す。
- **全段に status 参照が無い**(`appendAuditEntry`/`appendAuditEntryUnlocked`/`ensureAuditFile`/`auditFilePath`/`recordDir`/`activeIntent`)ため、完了 intent のカーソルが残る限り監査は完了 intent の shard へ append され続ける。

### 追記到達フックは7つ

`packages/framework/core/hooks/`(全11フック)を `grep -nE "emitAudit|appendAuditEntry|activeIntent|recordDir|auditFilePath|HUMAN_TURN|SENSOR_FIRED"` で判定した到達7フック:

| フック | 経路 |
|---|---|
| `amadeus-mint-presence.ts`(**主犯**) | `:73-74` ゲートは `existsSync(stateFilePath(projectDir))` のみ。毎ターン HUMAN_TURN を append。status ガード無し |
| `amadeus-audit-logger.ts` | `:122` `appendAuditEntry`(ARTIFACT_CREATED/UPDATED) |
| `amadeus-sensor-fire.ts` | dispatcher 経由で SENSOR_FIRED/SENSOR_PASSED を emit。#1248 実測で完了後 262 発火 |
| `amadeus-session-start.ts` | `:127` `appendAuditEntry(SESSION_STARTED/RESUMED)` |
| `amadeus-session-end.ts` | `:49` `appendAuditEntry("SESSION_ENDED")` |
| `amadeus-validate-state.ts` | `:65` `appendAuditEntry(SESSION_COMPACTED)` |
| `amadeus-log-subagent.ts` | `:66` `appendAuditEntry("SUBAGENT_COMPLETED")` |

非到達4フック(`amadeus-stop.ts` = 読取専用 `:212`、`amadeus-statusline.ts`、`amadeus-runtime-compile.ts`、`amadeus-sync-statusline.ts`)。到達7フックはすべて共通末端 `appendAuditEntry`→`auditFilePath`→`activeIntent` を通り、status ガードが無いため完了 intent の shard を汚染する。

### registry status 語彙

書込語彙 `"in-flight"`(birth `amadeus-lib.ts:1918`/`:2143`)、`"complete"`(`updateIntentStatus` 経由)、reader fallback `"unknown"`(`:1714`)。park の `"parked"` は directive 層の別軸。`activeIntent` は registry status を読まない(前述)。

## 再現(Issue #1248、e3/e4 クロスレビューで CONFIRMED)

intent `260718-hooks-config-conflict` が 2026-07-18 に complete・record は main 着地済みだが、カーソルが同 intent を指したまま → 完了後の会話で shard `audit/j5ik2o-mac-studio-lan-d4a945003a7f.md` に 6,000行超の完了後イベント蓄積(Sensor Fired 262 / Sensor Passed 256 / Human Turn 33)。record-sync PR を2本要した(#1246 +6,367行 / #1247 +12行)が、次のユーザーメッセージで再 dirty(モグラ叩き)。**カーソルファイルを手動削除した時点で追記停止**(7,825行で不変を実測)。e3/e4 の scratch 再現(repo 外・`--project-dir`/`CLAUDE_PROJECT_DIR` override)で complete 後もカーソル残留 → mint-presence/sensor-fire 経由で追記成立 → カーソル削除で停止、を両レビュアーが独立実証済み。

## 回帰テスト設計の入力(seam)

1. `handleCompleteWorkflow` 実行後に active-intent カーソルが完了 intent を指さない(clear または不解決)ことを検査 — 修正案1(エンジン側 clear)の閉包。
2. または `appendAuditEntry`/`auditFilePath` 経路で、参照先 intent の registry status が `complete` のとき追記が no-op になることを検査 — 修正案2(フック側防御層)の閉包。in-process seam(`appendAuditEntry`/`activeIntent`/`updateIntentStatus` 直接呼び出し)でカバーし spawn 盲点を避ける。
3. モグラ叩き閉包: complete → 追記トリガー(HUMAN_TURN 相当)→ shard 行数が増えないことを実測(元症状の非再現)。

## 修正時の影響面

- **影響しうる既存テスト**: `t07-hook-audit-logger.test.ts`、`t169-session-resume-rebind.test.ts`、`t213-orchestrate-parked-new-intent.test.ts`、`t112-delegated-approval.test.ts`、`t219-audit-fork-reentrant-seam.test.ts` ほか。特にカーソル clear を実装する場合は session-resume-rebind(t169)・parked-new-intent(t213)・audit-logger(t07)への回帰確認が必須。
- **dist 伝播面**: 正本 `packages/framework/core/tools/{amadeus-lib.ts, amadeus-state.ts, amadeus-audit.ts}` および `hooks/*.ts` を触ると 6ハーネス dist ツリー + self-install `.claude/` ツリーへ再生成が必要。同期 `bun scripts/package.ts` + `bun run promote:self`、検証 `bun run dist:check` / `bun run promote:self:check`(project.md Mandated 準拠)。

## CodeKB 9成果物の更新判断

| 成果物 | 判断 | 根拠 |
|---|---|---|
| `business-overview.md` | 温存 | business domain・利用者・価値に変化なし |
| `architecture.md` | **更新** | カーソルライフサイクルの set⇔clear 非対称と監査ルーティングチェーン(`activeIntent`→`recordDir`→`auditFilePath`、全段 status ゲート無し)は component 間の相互作用・監査フローの構造的事実であり、既存本文に未記載の新規知識。1節を簡潔追記 |
| `code-structure.md` | 温存 | ファイル/モジュール配置・core 中立層/表層境界に変化なし。フォーカス面は既存構造の欠落(clear 経路不在)であり配置の追加・移動はない |
| `api-documentation.md` | 温存 | external/internal API 変更なし |
| `component-inventory.md` | 温存 | component 追加・削除・責務変更なし |
| `technology-stack.md` | 温存 | runtime/framework/library/version 変更なし |
| `dependencies.md` | 温存 | external/internal dependency 変更なし |
| `code-quality-assessment.md` | 温存 | 欠陥の質的観測は本 per-intent 記録と architecture.md の非対称節に集約。churn 回避のため品質評価本文への重複追記はしない(架空の新規欠陥クラスタ導入を避ける) |
| `reverse-engineering-timestamp.md` | **更新** | 本 intent を最新 freshness block へ追加し、旧「最新: 260718-election-ts-foundation」を履歴へ降格(cid:reverse-engineering:c3-relabel) |

## Delivery Boundary

本 scan では実装、main merge/rebase、Issue close、GitHub 上のレビュー作成・更新操作を実施していない。既存 dirty シャードや旧 intent state/audit は変更していない。
