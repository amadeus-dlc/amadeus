# スキャンノート — 260723-archived-status-guard(Developer コードスキャン)

Issue #1396 / amadeus スコープ / Standard depth。registry status の enum 化 + archived 誤再開ガード(cursor 設定 / next / unpark を loud 拒否)+ archive/unarchive の human-presence 必須 verb + 260713-swarm-driver-migration の closed→archived 移行。本ノートは requirements/design が使う深掘り実測。識別子・パスは原文保持。

## 実行メタデータ

- base: `78bce8761`(祖先確認済み `git merge-base --is-ancestor` = YES、distance = `git rev-list --count 78bce8761..HEAD` = **38**)。前回 260723-t241-ci-residency の observed。
- observed(現 HEAD): `4310f686f71e1dc954657062bb7e2b143b553e64`(再実測・転記)
- ブランチ: `team/20260722-233519-0637/engineer-1`
- diff 規模(`git diff --shortstat 78bce8761 HEAD`): **140 files changed, 7228 insertions(+), 15 deletions(-)**
- **本バグ面との区間交差判定**: base→HEAD の非 record ソース変更は `tests/integration/t241-election-machine-executor.integration.test.ts` / `tests/integration/t257-ci-residency-marker-guard.integration.test.ts` / `tests/unit/gen-coverage-registry.test.ts` / `metrics/*.json` の4件のみ。**`amadeus-state.ts` / `amadeus-lib.ts` / `amadeus-orchestrate.ts` / `amadeus-utility.ts` / `amadeus-audit.ts`(本 intent の触る全ソース面)は base 前進で一切変更なし → 交差ゼロ**。残り136ファイルは record/audit ツリー。差分リフレッシュ上、本 intent の設計は現 HEAD のソースをそのまま基準にしてよい。

## 正本ファイルと規模(canonical = `packages/framework/core/tools/`)

| ファイル | 行数 | 本 intent での役割 |
|---|---|---|
| amadeus-lib.ts | 6589 | registry entry 型・updateIntentStatus・listIntents・cursor read/write・activeIntent・intentStatusForAudit・human-presence primitive |
| amadeus-state.ts | 4200 | complete-workflow・handleUnpark・handlePark・delegate provenance・assertHumanPresentForGateResolution・CLI verb dispatch |
| amadeus-orchestrate.ts | 3389 | `next` handler(active intent 解決 → run-stage 発行)・parked trap |
| amadeus-utility.ts | 5205 | `/amadeus intent <name>`(cursor 切替)・intent-birth |
| amadeus-audit.ts | (該当箇所) | 監査イベント enum・EVENT_HEADINGS・presence-mint 拒否・post-complete append seal |
| amadeus-audit-format 正本 | packages/framework/core/knowledge/amadeus-shared/audit-format.md | イベントレジストリ文書 |

**配布同期(必須)**: 上記正本の変更は `bun scripts/package.ts`(dist 再生成 6 harness: claude/codex/cursor/kiro/kiro-ide/opencode)+ `bun run promote:self`。検証は `bun run dist:check` / `bun run promote:self:check`(project.md Mandated)。audit-format.md も 6 dist + self-install へ投影される。

## 重点面ごとの実測

### 1. status 読み書きの全数目録(enum 化の伝播対象)

**registry entry 型**(`amadeus-lib.ts:1746-1765`)。status は**裸の `string`**(enum 未定義):
```
1757	  status: string;
```
enum 化 = ここへ判別ユニオン(例 `type IntentStatus = "in-flight" | "parked" | "complete" | "archived"`)を導入し、書き手/読み手を型で締める。

**canonical コードでの status 書込サイト(全数)**:
- `amadeus-lib.ts:2151` birthIntent → `status: "in-flight"`(新規 intent 初期値)
- `amadeus-lib.ts:2376` migrateFlatLayout → `status: "in-flight"`(flat 移行の初期値)
- `amadeus-state.ts:1904` complete-workflow → `updateIntentStatus(pd, completedIntentDir, "complete")`(**唯一の updateIntentStatus 呼出元** — feasibility の「呼出元1点」を確認)
- `amadeus-lib.ts:2163-2187` updateIntentStatus 本体(汎用 — `status: string` を受けて row を書き換え、`recordDirMatches` で dir 一致、`writeFileAtomic`。**workspace ロック前提**)

**status 読取サイト(全数)**:
- `amadeus-lib.ts:1836-1845` `intentStatusForAudit()` — active intent の registry status を返す(`recordDirMatches` join、未解決/不一致は `"unknown"`)
- `amadeus-lib.ts:1918` `listIntents()` — `status: entry.status` を IntentInfo へ写像。orphan は `status: "unknown"`(:1931)
- **`amadeus-audit.ts:342`** post-complete append seal(下記2.5 で詳述)— `if (intentStatusForAudit(...) === "complete")`。**"archived" を封じるなら本箇所が第一の enum consumer**

**`"in-flight"` / `"complete"` / `"closed"` 文字列リテラル repo 全域**:
- canonical `packages/framework`(非 test、status 文脈): 上記5サイトのみ(`amadeus-directive.ts` の `"parked"` は directive kind であって registry status ではない — 区別注意)
- test 側で intents.json status を直書きする主なファイル: `tests/integration/t165-intent-birth-p4.test.ts`(主)、`tests/unit/t160-workspace-record-resolution.test.ts`、`tests/harness/fixtures.ts:195`(`status: "in-flight"`)。※ `tests/` の `"complete"`/`r.status` 多数ヒットは spawn の exit code であり registry status ではない — 選別注意。
- **重要**: registry には現在 `"parked"` status は**一度も書かれていない**(park は state ファイルの `## Runtime State` 内 `Parked` フィールドであって registry status ではない)。Issue の enum(in-flight/parked/complete/archived)に含まれる `"parked"` は**現状 registry 未使用値** → 「型 domain として宣言するが書き手は設けない」のか「park 時に registry も parked にする」のかは**未決(要件で確定要)**。

### 2. cursor 書込・読出サイト全数(両側ガード挿入点)

定数 `ACTIVE_INTENT_POINTER = "active-intent"`(`amadeus-lib.ts:437`)。ファイル = `amadeus/spaces/<space>/intents/active-intent`(gitignored per-user)。

**cursor WRITE**:
- `amadeus-lib.ts:1942-1950` `setActiveIntentCursor()`(汎用 write、best-effort swallow)
- `amadeus-lib.ts:2154` birthIntent 内 setActiveIntentCursor
- `amadeus-lib.ts:2380` migrateFlatLayout 内 直接 writeFileSync
- **`amadeus-utility.ts:3928` `handleIntent()`** — `/amadeus intent <name>` 切替の setActiveIntentCursor。**「cursor 設定を loud 拒否」ガードの第一挿入点**(:3923 の unknown 拒否 `refuseWithoutAudit` の直後、切替対象 `match.status === "archived"` を実測して拒否)
- `amadeus-lib.ts:1957-1966` `clearActiveIntentCursor()`(complete 時 :1908 が呼ぶ。read-then-conditional-delete)

**cursor READ**:
- `amadeus-lib.ts:1198-1223` `activeIntent()` — 精度: explicit > cursor(実 record 名のとき)> lone-intent > null。cursor 読取は :1210-1213。**ここは path helper 層で status を見ない**(status 無関係の純粋解決)→ ガードは status を見る上位層(utility/orchestrate/state verb)に置くのが設計上自然。

### 3. unpark / next の解決連鎖(ガード前置点)

**handleUnpark**(`amadeus-state.ts:757-773`): `resolveProjectDir` → `withAuditLock` → `readStateFile(pd)`(active intent の state)→ `Parked`/`Parked At Stage` 除去 → `WORKFLOW_UNPARKED` 監査。**状態ファイルは読むが registry status は読まない** → 「archived なら unpark 拒否」は本関数の冒頭に registry status 実測(`intentStatusForAudit(pd)` 相当 or active intent の row 参照)を前置して loud 拒否する形。※ 現状 unpark に status ガードは皆無。

**orchestrate `next`**(`amadeus-orchestrate.ts` `handleNext` :1445〜): active intent の解決は state 経由(`activeIntent()` → stateContent)。parked trap は :1600-1614(`Parked` フィールド + `!flags.newIntent` 等の自己無効化条件)。**archived ガードは handleNext 早期(stateContent 解決後、run-stage 発行前)に active intent の registry status を実測し `"archived"` なら loud 拒否 directive を emit する形**。parked trap(state フィールド駆動)とは別レイヤ(registry 駆動)である点に注意。`--new-intent` は parked を回避する既存の逃げ道(:1588-1593、#834)—archived ガードも `--new-intent`(別 intent birth)は素通しさせる設計が自然。

### 4. complete の既存意味論(archived が模倣/相違すべき点)

`amadeus-state.ts:1895-1919`(complete-workflow 末尾):
1. `writeStateFile`
2. `completedIntentDir = activeIntent(pd)` → `updateIntentStatus(pd, completedIntentDir, "complete")`(:1904)
3. `clearActiveIntentCursor(pd, completedIntentDir)`(:1908 — #1248、完了 intent が audit 追記対象で在り続けるのを止める)
4. コメント(:1896-1901)明記: **「human-confirmed completion が駆動した determinism。state からの自動推論ではない(crash した run が自己 complete しない)。workspace ロック保持下」**

**archived が模倣すべき点**: (a) registry status flip + cursor release の対、(b) workspace ロック下の atomic 書込、(c) human-confirmed 駆動。
**archived が相違すべき点**: complete は state Status も終端だが、archived は**「未完了のまま棚上げ」**(260713 は state Status=`Running`、Current Stage=`code-generation` のまま closed)→ **archive は state ファイルの Status を触らず registry のみ archived にする**設計がありうる(要件で確定要)。post-complete と異なり archive は**可逆**(unarchive verb 対がある)。

### 5. human-presence 既習様式(verb 単位検証への再利用)

- `assertHumanPresentForGateResolution(pd, content, slug, verb)`(`amadeus-state.ts:2045-2079`)— **gate 解決専用**(verb は `"approve"|"reject"`、`humanActedSinceGate` = 直近 gate 解決以降の HUMAN_TURN 台帳検査)。archive/unarchive は gate ではない verb なので**そのままは使えない**(gate 境界の概念がない)。
- off-switch: `humanPresenceGuardDisabled()`(`amadeus-lib.ts:3851-3852` = `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD === "1"`)。テストの決定的バイパス。**新 verb ガードも同 off-switch を honour すべき**(t243/t165 様式との一貫性)。
- **verb 単位に最も再利用しやすい primitive** = delegate 系の生 HUMAN_TURN 読取(`handleDelegateApproval` :2664-2676): 自セッション audit shard を `findAllEvents(readFileSync(shard), "HUMAN_TURN")` で読み、`turns.length===0` なら loud error。archive/unarchive は「自セッション shard に HUMAN_TURN が存在するか」の verb-local チェックで足りる公算(gate 相対ではなく verb 相対)。`humanActedSinceLastAnswer`(`amadeus-lib.ts:3036`)も候補 primitive。
- `isAutonomousMode(content)` 免除(:2051)は archive/unarchive では**不要**(archive は運用者操作であって autonomous construction 経路にない)—要件判断。

### 6. 監査イベント様式(INTENT_ARCHIVED / INTENT_UNARCHIVED 追加手順)

- **既存 INTENT_ イベントは皆無**(`grep INTENT_ARCHIVED|INTENT_UNARCHIVED|INTENT_BORN` = 0 件。birth も INTENT_ 系を出さず WORKFLOW_STARTED で代替)。
- イベント enum: `amadeus-audit.ts:38-162` の `VALID_EVENT_TYPES` Set。Workflow lifecycle 群(:48-51)= WORKFLOW_STARTED/COMPLETED/PARKED/UNPARKED。
- **正規追加手順(3〜4 箇所)**:
  1. `VALID_EVENT_TYPES` Set へ `"INTENT_ARCHIVED"` / `"INTENT_UNARCHIVED"` 追加
  2. `EVENT_HEADINGS` map(:166〜)へ見出し追加(例 `INTENT_ARCHIVED: "Intent Archived"`)
  3. audit-format.md(正本 `packages/framework/core/knowledge/amadeus-shared/audit-format.md`)へ行追加 — **ヘッダ件数 `Event Registry (75 events, 19 categories)`(:11)と該当カテゴリ件数の手動同期が必要**(count-comment-sync-on-catalog-change / 新カテゴリ「Intent Lifecycle」を起こすなら 19→20)
  4. dist×6 + self-install 再生成
- **presence 保護判断**: `PRESENCE_PROTECTED_EVENTS`(:802-812 = HUMAN_TURN/DELEGATED_*/GRANT_*)。archive/unarchive が human-presence 必須なら、**general audit CLI での偽造 mint を拒否したいか**を要件で決める(HUMAN_TURN 相当の provenance を持たせるなら本 Set + `PRESENCE_PROTECTED_HEADINGS` へ追加。ただし archive verb 自体が trusted in-process writer なら、その verb 内で emit する分には Set 追加は「CLI 直叩き偽造」を防ぐ用途)。
- **⚠ 順序ハザード(要設計解決)**: post-complete seal(下記2.5 = `amadeus-audit.ts:342`)を `status === "archived"` にも拡張すると、**archive で status を archived に flip した後に INTENT_ARCHIVED を emit すると seal で追記が抑止される**(逆に unarchive の INTENT_UNARCHIVED は「まだ archived」の状態で emit すると抑止される)。解決案: (a) 監査 emit を status flip より前に行う、(b) INTENT_ARCHIVED/UNARCHIVED を seal 対象外イベントとして扱う、(c) archive/unarchive verb を seal チェックの例外にする。**これは requirements/design で明示裁定すべき第一級論点**。

#### 2.5 post-complete audit seal(#1248、archived の直系モデル)

`amadeus-audit.ts:337-349`:
```
337	  if (intentStatusForAudit(projectDir, intent, space) === "complete") {
        ... suppressed ${eventType} append — target intent ${targetDir} is complete (#1248)
        return { appended: false, reason: "intent-complete", ... };
```
「registry row が complete = 台帳封印、追記拒否」。**archived intent も同様に封印すべき**なら `=== "complete"` を `("complete" | "archived").includes(...)` 等へ拡張(reason 文字列も分岐)。この拡張が archived 誤再開ガードの「audit 面」の核。

### 7. 260713-swarm-driver-migration の現物(移行が touch する面)

- **registry 行**(`amadeus/spaces/default/intents/intents.json` — canonical registry、69 行):
  ```
  {"uuid": "019f59b8-d24b-7000-8027-f432910b27cc", "slug": "swarm-driver-migration", "dirName": "260713-swarm-driver-migration", "scope": "amadeus", "status": "closed"}
  ```
  **`"closed"` は 69 行中この1行のみ**(status 分布: complete×65、in-flight×3、closed×1)。移行 = この1行の `"closed"` → `"archived"`。
- in-flight×3 = 260719-mirror-productization / 260722-space-record-catalog / 260723-archived-status-guard(本 intent)。
- **closure-note.md**(`.../260713-swarm-driver-migration/closure-note.md`)裁定 verbatim(抜粋):
  > 「本 intent の workflow は code-generation 段(Status: Running)のまま終端 — **complete ではない**(Bolt 成果物は main 未着地)。intents.json の status は `closed` へ変更(実態表記 — **engine はこの文字列を制御に使わないことを grep で確認済み**)」
  > 「1. ライブ配線分の縮小上程 … origin/codex/swarm-driver-integration — 削除しないこと … 2. native driver 統合 … 実装・配線する intent とセットでのみ再上程 … 3. units-generation の規模列に概算行数レンジを必須併記」
  → **本 intent はまさにこの「engine が制御に使わない実態表記 closed」を正規 enum 値 archived へ昇格し、誤再開を機械ガードする一般化**。
- **amadeus-state.md**: `Current Stage: code-generation` / `Status: Running`(:94)/ `## Runtime State`(:31)に Parked フィールドなし。→ **移行は registry 行のみ変更、state ファイルは不変**が closure-note の意図と整合(complete と違い state を終端化しない)。

### 8. テスト地形(落ちる実証・回帰材料)

- **最大テスト番号 = t257**(`t257-ci-residency-marker-guard`)→ **新規空き = t258 以降**。並行 swarm 採番時はユニット別事前予約(swarm-test-number-reservation)。
- **直系テンプレート**:
  - `tests/integration/t243-post-complete-audit-stop.test.ts`(283行)— **#1248 の audit seal + cursor release を dist に対し in-process 検証**。covers: `function:clearActiveIntentCursor function:intentStatusForAudit`。archived seal テストはこれをミラー(status="archived" → `{appended:false}`)。落ちる実証様式も記載済み(pre-fix dist では seal 不在で `{appended:true}` になり赤)。
  - `tests/integration/t165-intent-birth-p4.test.ts`(478行)— covers `function:updateIntentStatus function:listIntents subcommand:amadeus-utility:intent`。intent 切替・status flip・birth の統合。archive/unarchive verb + cursor 切替ガードの主テスト母体。
  - `tests/unit/t167-session-intent-helpers.test.ts` — cursor/session helper 純関数層。
  - `tests/unit/t160-workspace-record-resolution.test.ts` — activeIntent/recordDir 解決。
- **層の指針**: 実 FS を触る検証は integration-first(fs-tests-integration-first)。t243/t165 が既に integration 層。spawn ではなく in-process seam を駆動(bun-coverage-spawn-blindspot / t243 が既実演)。
- 回帰観点: archived intent への (a) `/amadeus intent <archived>` 切替拒否、(b) `next`(cursor=archived)拒否、(c) `unpark`(active=archived)拒否、(d) archived intent への audit append 封印、(e) archive/unarchive の human-presence 必須(off-switch honour)、(f) unarchive で in-flight へ復帰後の再操作可、の各 loud 拒否・成功パスを実測。

### 9. #1309 整合材料(e2 intent 260722-space-record-catalog)

- e2 intent は現在 **ideation フェーズのみ**(最新ステージ = scope-definition。design 成果物なし)。
- **intents.json の status enum を定義する成果物は e2 に存在しない**。e2 のスコープは別レジストリ = **`elections.json`(新設: `electionId / dirName / createdAt(UTC) / status`)** と electionId→パス解決(scope-document より verbatim: 「新設レジストリ(electionId / dirName / createdAt(UTC) / status)」)。
- **並行注意点(coordination、blocker ではない)**: 両 intent とも "status" フィールドを扱うが**別レジストリ**(本 intent = intents.json、e2 = elections.json)。enum 型を共有 export するか各レジストリ別型にするかは、e2 が design に到達した時点の調整事項。現時点では**本 intent は intents.json status enum を独立に設計してよい**(e2 に既決の共有契約は無い)。branch `team/20260722-233519-0637/engineer-2` にも intents.json status enum 定義は未確認。

## enum 伝播対象の全数目録(設計チェックリスト)

| # | サイト | file:line | 変更種別 |
|---|---|---|---|
| 1 | IntentRegistryEntry.status 型 | amadeus-lib.ts:1757 | 裸 string → IntentStatus 判別ユニオン |
| 2 | IntentInfo.status 型 | amadeus-lib.ts:1890 | 同上(または string 維持で orphan "unknown" を許容) |
| 3 | birthIntent 初期値 | amadeus-lib.ts:2151 | "in-flight" を enum メンバへ |
| 4 | migrateFlatLayout 初期値 | amadeus-lib.ts:2376 | 同上 |
| 5 | updateIntentStatus 引数型 | amadeus-lib.ts:2166 | status: string → IntentStatus |
| 6 | complete-workflow flip | amadeus-state.ts:1904 | "complete" を enum メンバへ |
| 7 | post-complete audit seal | amadeus-audit.ts:342 | `=== "complete"` を archived 包含へ拡張(seal の核) |
| 8 | intentStatusForAudit 戻り値 | amadeus-lib.ts:1836/1842 | entry.status(string→IntentStatus \| "unknown") |
| 9 | 新 archive/unarchive verb | amadeus-state.ts(新設、CLI dispatch :488-552 の Valid 一覧へ追加) | updateIntentStatus(...,"archived"/"in-flight")+ human-presence + 監査 emit |
| 10 | cursor 切替ガード | amadeus-utility.ts:3928 handleIntent | archived 切替を loud 拒否 |
| 11 | next ガード | amadeus-orchestrate.ts handleNext(:1445〜) | active=archived を loud 拒否 directive |
| 12 | unpark ガード | amadeus-state.ts:757 handleUnpark | active=archived を loud 拒否 |
| 13 | 監査イベント enum + heading | amadeus-audit.ts:38-162 / EVENT_HEADINGS:166〜 | INTENT_ARCHIVED / INTENT_UNARCHIVED |
| 14 | audit-format.md | packages/framework/core/knowledge/amadeus-shared/audit-format.md:11,13 | 件数ヘッダ + 新カテゴリ/行(手動同期) |
| 15 | 移行データ | intents.json 260713 行 | "closed" → "archived" |
| 16 | dist×6 + self-install | scripts/package.ts / promote:self | 上記正本すべての再生成 + dist:check/promote:self:check |
| 17 | test fixtures | t243/t165/t160/fixtures.ts:195 等 | 新 verb・seal・ガードの回帰 + tNNN=t258〜 |

## 不確定事項(requirements/design で確定要)

1. **`"parked"` の registry 化**: Issue enum は parked を含むが現状 registry は未使用。型 domain 宣言のみか、park verb が registry も parked へ flip するか(後者は handlePark:723 に registry 書込追加 + 交差増)。
2. **順序ハザード**(6章 ⚠): archive/unarchive の監査 emit と status flip の順序、または seal 例外扱い。第一級論点。
3. **archive が state Status を触るか**: closure-note の意図(complete でない棚上げ)からは registry のみが自然だが明示裁定要。
4. **human-presence 検査の粒度**: gate 相対(assertHumanPresentForGateResolution 流用不可)vs verb 相対(delegate 流の自 shard HUMAN_TURN 読取)。autonomous 免除の要否。off-switch honour は前提。
5. **presence-mint 保護**: INTENT_ARCHIVED/UNARCHIVED を PRESENCE_PROTECTED_EVENTS に入れて CLI 偽造を拒否するか。
6. **archive の識別子指定**: archive は active intent 限定か、`<record-dir>` 明示指定可か(260713 は非 active → **明示指定必須**の公算。state CLI checkbox/set は active 限定 = state-cli-cursor-switch-repair-interim 参照。archive verb は registry 操作なので dirName 明示で任意 intent を対象化するのが自然)。
7. **unarchive の復帰先 status**: archived → in-flight 固定か、archive 前 status を記録して復元か(260713 は元々 complete でなく Running/未完なので in-flight 復帰が妥当だが要確定)。
