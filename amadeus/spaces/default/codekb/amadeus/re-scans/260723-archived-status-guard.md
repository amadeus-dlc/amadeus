# re-scan 記録 — 260723-archived-status-guard

## 実行メタデータ

- Date: 2026-07-23（scan-notes 実行日の転記）
- Intent: `260723-archived-status-guard`（[Issue #1396](https://github.com/amadeus-dlc/amadeus/issues/1396) — intent registry `status` の enum 化 + archived 誤再開ガード（cursor 設定 / `next` / unpark を loud 拒否）+ archive/unarchive の human-presence 必須 verb + 260713-swarm-driver-migration の `closed`→`archived` 移行）
- Scope: `amadeus`（Depth Standard）
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: differential refresh（cid:reverse-engineering:c1、E-L63 の base 選定則）。base `78bce87615b985d0151f604c915c6aab1d6ba9f1`（前回 scan `260723-t241-ci-residency` の observed、`re-scans/` 到達可能 observed のうち HEAD 祖先で距離最小）、observed `4310f686f71e1dc954657062bb7e2b143b553e64`（現 HEAD 実測 `git rev-parse HEAD`）、`git merge-base --is-ancestor base HEAD` exit 0、distance `git rev-list --count base..HEAD`=38。Developer スキャン→Architect 合成の直列（cid:reverse-engineering:c3）。
- 測定 ref: 全 file:line は Observed=HEAD `4310f686f` のワークツリー実ファイル直読（Developer scan + Architect 再実測、cid:measurement-ref-in-artifacts）。区間件数（38）・diff 規模（140 files, +7228/−15）はコマンド出力からの転記（numbers-from-command-output-only）。確約級引用（`amadeus-lib.ts:1757`、`amadeus-audit.ts:342`、`amadeus-state.ts:1904`、`amadeus-utility.ts:3928`、intents.json status 分布）は Architect が observed HEAD で再実測確定。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。

## diff 規模（機械集計、ref = base..HEAD）

- `git diff --shortstat 78bce8761 HEAD`: `140 files changed, 7228 insertions(+), 15 deletions(-)`（scan-notes 転記）。大半は前 intent `260723-t241-ci-residency` の record/audit + codekb re-scan + memory。
- **★本 intent ソース面は base..HEAD で無変更**: `amadeus-state.ts` / `amadeus-lib.ts` / `amadeus-orchestrate.ts` / `amadeus-utility.ts` / `amadeus-audit.ts`（本 intent の触る全ソース面）は base 前進で一切変更なし → 交差ゼロ（scan-notes 実測）。base→HEAD の非 record ソース変更は `tests/integration/t241-election-machine-executor.integration.test.ts` / `tests/integration/t257-ci-residency-marker-guard.integration.test.ts` / `tests/unit/gen-coverage-registry.test.ts` / `metrics/*.json` の4件のみで、本 intent の設計面とは無交差。現 HEAD のソースをそのまま設計基準にしてよい。

## 現行結論（原因所在）

**確定した機構（静的読解、observed HEAD `4310f686f` 実読）**: intent registry（`amadeus/spaces/default/intents/intents.json`）の `status` は裸 `string`（`amadeus-lib.ts:1757`、verbatim `  status: string;`）で、書き手 5 サイト・読み手 3 サイトが型で締まっていない。260713-swarm-driver-migration が closure-note で「engine が制御に使わない実態表記」として付けた `"closed"`（intents.json 69 行中この1行のみ、status 分布 = complete×65 / in-flight×3 / closed×1 を Architect 再実測で一致確認）が、機械制御されないまま残っている。

- **status 書込 5 サイト**: `amadeus-lib.ts:2151` birthIntent（`status: "in-flight"`）/ `:2376` migrateFlatLayout / `:2163-2187` updateIntentStatus 本体（workspace ロック前提、`recordDirMatches`+`writeFileAtomic`、引数 :2166）/ `amadeus-state.ts:1904` complete-workflow（`updateIntentStatus(pd, completedIntentDir, "complete")` = 唯一の updateIntentStatus 呼出元）。
- **status 読取 3 サイト**: `amadeus-lib.ts:1836-1845` intentStatusForAudit（未解決/不一致 `"unknown"`）/ `:1918` listIntents（orphan `"unknown"` :1931）/ **`amadeus-audit.ts:342`** post-complete append seal（`if (intentStatusForAudit(...) === "complete")`、追記封印 `{appended:false, reason:"intent-complete"}`）。
- **archived 誤再開ガード 3 挿入点**: handleIntent `amadeus-utility.ts:3928`（cursor 切替、`refuseWithoutAudit` :3924 直後）/ handleNext `amadeus-orchestrate.ts:1445〜`（run-stage 発行前、parked trap :1600-1614 は別レイヤ）/ handleUnpark `amadeus-state.ts:757-773`（現状 registry status を読まない）。いずれも `--new-intent`（別 intent birth、orchestrate :1588-1593 #834）は素通し。
- **complete の直系モデル**: `amadeus-state.ts:1895-1919` = status flip（:1904）+ cursor release（`clearActiveIntentCursor` :1907 #1248）を workspace ロック下 atomic、human-confirmed 駆動（コメント :1900-1901）。t243（post-complete audit stop、283行）/ t165（intent-birth-p4、478行）がテンプレ。archived は模倣（flip+release の対 / ロック下 atomic / human-confirmed）しつつ、「未完了の棚上げ」ゆえ state Status 不干渉・可逆（unarchive 対）で相違。
- **監査イベント追加**: 既存 INTENT_ 系ゼロ（birth も WORKFLOW_STARTED 代替）。INTENT_ARCHIVED/UNARCHIVED を VALID_EVENT_TYPES（`amadeus-audit.ts:38-162`）+ EVENT_HEADINGS（:166〜）+ audit-format.md 正本（件数ヘッダ :11 `75 events, 19 categories` の手動同期、cid:count-comment-sync-on-catalog-change）+ dist×6 で追加。presence 保護 Set（:802-812）追加は要件判断。
- **human-presence の verb 相対 primitive**: gate 専用 `assertHumanPresentForGateResolution`（:2045-2079）は流用不可。delegate 流の自 shard HUMAN_TURN 読取（`:2664-2676`）+ off-switch（`amadeus-lib.ts:3851-3852` `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD==="1"`）を再利用。

**原因の所在（cid:bug-intent-linkage）**: バグ修正ではなく Issue #1396 の enhancement 設計下地。260713-swarm-driver-migration が実態表記で残した「engine 非制御の `closed`」を、正規 enum 値 + 機械ガードへ昇格する**要件面の一般化**。260713 の closure-note が「engine はこの文字列を制御に使わないことを grep で確認済み」と明記した運用ギャップが起点。

## テスト番号の訂正

- 最大テスト番号は `tests/{integration,unit,e2e,smoke}` の実測で **t257**。scan-notes §8 は「新規空き = t258 以降」と記載したが、**t258 は PR #1407 が本日確保済み**のため、本 intent の新規テストは **t261 以降**を用いる（並行 swarm 採番時はユニット別事前予約、cid:swarm-test-number-reservation）。

## 設計裁定 目録（7 件 — requirements / design で確定要）

| # | 論点 | 現状の実測事実 | 設計上の分岐 |
| --- | --- | --- | --- |
| 1 | **`"parked"` の registry 化** | registry には `"parked"` が一度も書かれていない（park は state ファイル `## Runtime State` の `Parked` フィールド）。Issue enum は parked を含む | 型 domain として宣言のみ（書き手を設けない）か、handlePark（:723）が registry も `"parked"` へ flip するか（後者は交差増） |
| 2 | **順序ハザード（第一級）** | seal（`amadeus-audit.ts:342`）を archived 包含へ拡張すると、status flip 後の INTENT_ARCHIVED emit が seal で抑止される（unarchive は逆） | (a) emit を flip より前 / (b) INTENT_ARCHIVED/UNARCHIVED を seal 対象外 / (c) archive/unarchive verb を seal 例外 |
| 3 | **archive が state Status を触るか** | closure-note の意図は「complete でない棚上げ」（260713 は state `Status: Running` / `Current Stage: code-generation` のまま） | registry のみ archived（state 不干渉、自然）か state Status も終端化するか |
| 4 | **human-presence 検査の粒度** | gate 相対 primitive（:2045-2079）は gate 境界を持つ verb 専用。archive/unarchive は gate なし | verb 相対（delegate 流の自 shard HUMAN_TURN 読取 :2664-2676）を採用。autonomous 免除の要否、off-switch honour は前提 |
| 5 | **presence-mint 保護** | `PRESENCE_PROTECTED_EVENTS`（:802-812 = HUMAN_TURN/DELEGATED_*/GRANT_*）が general audit CLI での偽造 mint を拒否 | INTENT_ARCHIVED/UNARCHIVED を Set + `PRESENCE_PROTECTED_HEADINGS` へ入れて CLI 偽造を拒否するか（trusted in-process writer 前提なら不要） |
| 6 | **archive の識別子指定** | 260713 は非 active intent。state CLI checkbox/set は active 限定（cid:state-cli-cursor-switch-repair-interim）。archive は registry 操作 | active 限定か `<record-dir>` / dirName 明示指定可か（非 active 対象化なら明示指定必須の公算） |
| 7 | **unarchive の復帰先 status** | 260713 は元々 complete でなく Running/未完 | archived→`"in-flight"` 固定か、archive 前 status を記録して復元するか（未完起源なら in-flight 復帰が妥当） |

## #1309 整合材料（e2 intent 260722-space-record-catalog）

- e2 intent は現在 **ideation フェーズのみ**（最新ステージ = scope-definition、design 成果物なし）。intents.json status enum を定義する成果物は e2 に**存在しない**。
- e2 のスコープは別レジストリ = **`elections.json`**（新設: electionId / dirName / createdAt(UTC) / status）と electionId→パス解決（scope-document verbatim）。branch `team/20260722-233519-0637/engineer-2` にも intents.json status enum 定義は未確認。
- **並行注意点（coordination、blocker ではない）**: 両 intent とも "status" フィールドを扱うが**別レジストリ**（本 intent = intents.json、e2 = elections.json）。enum 型を共有 export するか各レジストリ別型にするかは e2 が design 到達時の調整事項。**現時点では本 intent は intents.json status enum を独立に設計してよい**（e2 に既決の共有契約なし）。

## 配布同期（必須）

正本 = `packages/framework/core/tools/`（TS ソース）と `packages/framework/core/knowledge/amadeus-shared/audit-format.md`（イベントレジストリ文書）。変更は `bun scripts/package.ts`（dist 再生成 6 harness: claude/codex/cursor/kiro/kiro-ide/opencode）+ `bun run promote:self`、検証は `bun run dist:check` / `bun run promote:self:check`（project.md Mandated）。audit-format.md も 6 dist + self-install へ投影される。

## enum 伝播対象の全数目録（設計チェックリスト、file:line = observed `4310f686f`）

| # | サイト | file:line | 変更種別 |
|---|---|---|---|
| 1 | IntentRegistryEntry.status 型 | `amadeus-lib.ts:1757` | 裸 string → IntentStatus 判別ユニオン |
| 2 | IntentInfo.status 型 | `amadeus-lib.ts:1890` | 同上（または string 維持で orphan "unknown" 許容） |
| 3 | birthIntent 初期値 | `amadeus-lib.ts:2151` | "in-flight" を enum メンバへ |
| 4 | migrateFlatLayout 初期値 | `amadeus-lib.ts:2376` | 同上 |
| 5 | updateIntentStatus 引数型 | `amadeus-lib.ts:2166` | status: string → IntentStatus |
| 6 | complete-workflow flip | `amadeus-state.ts:1904` | "complete" を enum メンバへ |
| 7 | post-complete audit seal | `amadeus-audit.ts:342` | `=== "complete"` を archived 包含へ拡張（seal の核） |
| 8 | intentStatusForAudit 戻り値 | `amadeus-lib.ts:1836/1842` | entry.status（string→IntentStatus \| "unknown"） |
| 9 | 新 archive/unarchive verb | `amadeus-state.ts`（CLI dispatch :488-552 の Valid 一覧へ追加） | updateIntentStatus(archived/in-flight) + human-presence + 監査 emit |
| 10 | cursor 切替ガード | `amadeus-utility.ts:3928` handleIntent | archived 切替を loud 拒否 |
| 11 | next ガード | `amadeus-orchestrate.ts` handleNext（:1445〜） | active=archived を loud 拒否 directive |
| 12 | unpark ガード | `amadeus-state.ts:757` handleUnpark | active=archived を loud 拒否 |
| 13 | 監査イベント enum + heading | `amadeus-audit.ts:38-162` / EVENT_HEADINGS:166〜 | INTENT_ARCHIVED / INTENT_UNARCHIVED |
| 14 | audit-format.md | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:11` | 件数ヘッダ + 新カテゴリ/行（手動同期） |
| 15 | 移行データ | `intents.json` 260713 行 | "closed" → "archived" |
| 16 | dist×6 + self-install | `scripts/package.ts` / `promote:self` | 上記正本すべての再生成 + dist:check/promote:self:check |
| 17 | test fixtures | t243/t165/t160/`tests/harness/fixtures.ts:195` 等 | 新 verb・seal・ガードの回帰 + tNNN=**t261〜** |

## 回帰観点（落ちる実証・テスト母体）

- 直系テンプレ: `tests/integration/t243-post-complete-audit-stop.test.ts`（283行、seal+cursor release の dist 対 in-process 検証、落ちる実証様式記載済み）/ `tests/integration/t165-intent-birth-p4.test.ts`（478行、切替/status flip/birth）/ `tests/unit/t167-session-intent-helpers.test.ts` / `tests/unit/t160-workspace-record-resolution.test.ts`。
- 実 FS 検証は integration-first（cid:fs-tests-integration-first）、in-process seam 駆動（cid:bun-coverage-spawn-blindspot、t243 実演）。
- archived intent への (a) `/amadeus intent <archived>` 切替拒否、(b) `next`（cursor=archived）拒否、(c) `unpark`（active=archived）拒否、(d) audit append 封印、(e) archive/unarchive の human-presence 必須（off-switch honour）、(f) unarchive で in-flight 復帰後の再操作可、の各 loud 拒否・成功パスを実測。
