# コード構造

## team 起動 watcher-arming の構造面（260722-teamup-prompt-race、2026-07-22、現在）

bugfix / Minimal。observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`（距離101）。本 intent の交差構造は `scripts/` の team 起動オーケストレーション（core 中立層・harness 表層とは別系統のリポジトリ開発支援スクリプト面）に限定。

| 構造面 | 現行責務 | 本バグとの関係 |
|---|---|---|
| `scripts/team-up.sh`（+212 −8、260721 起点） | Herdr pane 上へ claude/codex メンバーを起動する team オーケストレータ | claude 起動経路 `:800`/`:830-832` が init_prompt 一発供給、`:338-395` の supervisor は codex 限定 |
| `scripts/run-claude.sh` | 末尾 `exec claude --dangerously-skip-permissions "$@"` | init_prompt を位置引数として claude へ委譲 |
| `scripts/team-up-codex-safety-wait.ts`（新規 +567、260721） | Codex pane readiness 検証（`resolve`/`readVisible` `:273-338`、`PRODUCTION_FINGERPRINTS` `:72,177`） | claude 非対応。claude 版 readiness の構造先例 |
| agmsg skill（repo 外 `~/.agents/skills/agmsg/`、read-only 参照） | `spawn.sh` の ready handshake、`lib/actas-lock.sh` の path 算出、`watch.sh` のセンチネル生成 | team-up claude 経路に欠ける契約の対照。実装は本 repo 外で不変更 |
| team-up テスト（`tests/integration/t-team-up-*`、`tests/unit/t-team-up-codex-safety-wait.test.ts`） | team 起動・msg backend・codex safety-wait の検査 | watcher arming（init_prompt/ready/watch）の被覆なし |

修正は `scripts/` に閉じる想定で、`packages/framework/core` / `harness` の正本や dist/self-install には交差しない見込み（実装時に実 diff で再評価、cid:code-generation:c6）。

> 以下は過去 intent の履歴。

## upstream-sync-230 の変更面（2026-07-20、履歴）

現行 observed `545e69c836d46f7bec2fa351c8e668026eb5fad5` の構成は、core tools 30、hooks 11、agents 14、stages 32、sensors 5、6ハーネス固有 69 files、TypeScript 621 files、tests 461 files（unit 216 / integration 159 / e2e 70 / smoke 14）である（測定 ref: Developer scan の `find`/test runner 分類、observed HEAD）。主要変更面は次の通り。

| 正本面 | 現行責務 | upstream-sync の変更点 |
|---|---|---|
| `packages/framework/core/tools/amadeus-stage-schema.ts` | stage frontmatter の検査 | number/name/bundle/required_sections、Unit kind の schema 追加 |
| `packages/framework/core/tools/amadeus-graph.ts` / parser | stage graph 構築 | kind 別 pruning、plugin 由来 stage の正規化 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | directive routing（134 switch arms） | DAG 自己修復、gate/help/compose/recompose、next-stage 投影 |
| `packages/framework/core/tools/amadeus-utility.ts` | workspace/scope/compose CLI | nested/submodule、cost preview、help/autonomy guard |
| `packages/framework/core/hooks/` | session・stop・state・sensor 契約 | compose marker 鮮度と Kiro IDE context の適応 |
| `packages/framework/harness/{name}/` | 6ホスト固有 adapter | `execPath`、quote、plugin host projection |
| `scripts/package.ts` | manifest から6ハーネスを自動発見 | plugin source の discovery/projection/no-clobber |
| `scripts/promote-self.ts` | 4ハーネスを self-install | dist 済み plugin の closed-list 投影 |
| `tests/` | Bun テストと drift/coverage ゲート | 24項目の回帰、upstream t199-t219/t188 再著作 |

plugin の source、`dist/plugins`、host projection は別オーナーとする。source を manifest に追加しただけで host tree へ漏らしてはならず、`scripts/package.ts` の byte/orphan/unreferenced 検査（`:643-729`）を所有境界の最終ガードにする。`when` は現在 schema が予約語として拒否するため、今回の公開契約変更として扱い、暗黙に受理しない。

> 以下は過去 intent の履歴。

## Codex hooks 設定競合の観測面（履歴: 260718-hooks-config-conflict）

[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770) の writer／reader を observed HEAD `594ba21d636218558b711b371c286f16731fb081` と外部 agmsg 1.1.7 で対称走査した。base `e9a001105d253e14affb77417423d9f0b0360f9e` は observed の祖先（距離8）で、フォーカスファイルの区間契約変更は0件。

### repository 側の正準生成・活性化・保全

| 面 | 現行実装 | 観測した責務 |
| --- | --- | --- |
| hook 正本 | `packages/framework/harness/codex/emit.ts:25-54` | `HOOK_WIRING` 9 command を整形済み JSON として生成 |
| 配布 | `emit.ts:291-298` | real active file ではなく `dist/codex/.codex/hooks.json.example` だけを emit |
| install／fixture | `docs/guide/harnesses/codex-cli.md:25-38`、`tests/harness/fixtures.ts:619-625` | example を exact `.codex/hooks.json` へコピーして Codex discovery を活性化 |
| trust reader | `emit.ts:156-172` | trust key を exact active path `.codex/hooks.json` へ結び付ける |
| self-install | `scripts/promote-self.ts:84-97,207-299` | active file を比較・上書き・orphan 除去から preserve |
| 再起動入口 | `scripts/run-codex.sh:5-10`、`scripts/team-up.sh:742-748` | agmsg shim を起動し、Codex member ごとに monitor 設定を再適用 |

HEAD の `.codex/hooks.json`、`.codex/hooks.json.example`、dist example は同一 blob `8eeff909b38467415fdd63a93631db74f91e5b4f`（1925 bytes／93 lines）。現 worktree の active file は user-owned dirty runtime stateで、2021 bytes／末尾改行なし、Git diff は1 insertion／93 deletionsだが、9個の Amadeus command は全て保持されている。

### 外部 agmsg writer／reader と再起動経路

| 面 | 現行実装 | 観測した責務 |
| --- | --- | --- |
| active path 解決 | `~/.agents/skills/agmsg/scripts/drivers/types/codex/type.conf:18-22`、`delivery.sh:63-81` | `hooks_file=.codex/hooks.json` を project-relative に解決 |
| writer | `delivery.sh:86-150` | copy→SessionStart／SessionEnd／Stop の agmsg group strip→mode entry add→`mv` |
| JSON 再構築 | `hooks-json.sh:35-82,102-158` | SQLite JSON1 `readfile()`／`writefile()` と `json_set`／`json_remove` で compact rewrite |
| mode reader | `delivery.sh:172-220` | active hooks の agmsg-owned SessionStart／Stop から mode を導出 |
| shim routing | `codex-shim.sh:112-159` | status が厳密に `mode: monitor` のときだけ monitor wrapper へ転送 |
| monitor startup | `codex-monitor.sh:97-213` | app-server を起動／再利用し、`:194` で毎回 `set monitor`、bridge launcher 後に Codex を exec |

same mode の再設定は既存 agmsg group を先に除去するため entry 重複を防ぐが、tracked bytes の不変性は保証しない。monitor は SessionStart と SessionEnd を各1件追加し、command／commandWindows に解決済み skill path と clone path を埋め込む。`.codex/agmsg-delivery-mode` は agmsg 1.1.7 source で reader／writer を別々に走査して双方0件であり、正の source of truth は hooks JSON である。[PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) の marker ignore／preserve は legacy marker の残置を扱うが、この writer path は変えない。

恒久処理は active file の untrack／ignore と static dispatcher + ignored sidecar の二案が `【裁定待ち】`。どちらを採る場合も、全9 Amadeus command、Codex 再起動後の monitor delivery、tracked content の machine／clone path 不在を同じ fixture で固定する必要がある。

## delegate provenance 機構の観測 — 常任委任グラントの挿入面（履歴: 260717-standing-delegation-gran）

amadeus intent（Issue #1125 — 常任委任グラント機構。ステージゲートごとの都度 delegate 発行を、明示的に付与された「常任委任グラント」で一定範囲・一定期間だけ省ける機構の設計基盤調査）の diff-refresh 観測面。出典は本 intent の `inception/reverse-engineering/scan-notes.md`（Developer scan、observed HEAD `46f51091f0c8d5d39dc9790a218d03293ffdf060` 直読の file:line、measurement-ref を全数に明記）。手法は diff-refresh（base=`e530fc4b13f477e9155d1ec246fd50a49176eadd`、祖先性 `git merge-base --is-ancestor` exit 0・距離67 実測、observed=`46f51091f`）。**区間 diff（427 files / +17676）の実体は前 intent 260716-answer-preemption-guard の answer-evidence guard 着地であり、本 intent が消費・拡張する delegate provenance 機構は区間より前から安定 = 挿入 seam は現 HEAD 実測で確定**。

### 挿入 seam は3層で分離（scan-notes §2）

- **(a) `amadeus-lib.ts` — 検証・接地の純関数層**:
  - `verifyDelegatedProvenance(projectDir, block): boolean`（定義 **:2528-2565**）: block から4座標（Issuer Intent / Issuer Shard / Issuer Human Ts / Issuer Space）を抽出し、必須3つ欠落なら false。path-shape ガード（`issuerIntent` は `/^[A-Za-z0-9._-]+$/` かつ `.`/`..` 拒否 :2534-2536、`issuerShard` は `/^[A-Za-z0-9._-]+\.md$/` :2537）。`auditShardDir` で解決した shard に `HUMAN_TURN` イベントで `Timestamp === issuerHumanTs` の block が物理的に存在すれば true（:2547-2551）。**あらゆる異常（欠落/不正フィールド、path-shape 違反、shard 読取不能、HUMAN_TURN 不在）で fail-closed**（コメント :2523-2526、各 `return false`）。呼び出し元は `scanPresenceLedger` 内の DELEGATED_APPROVAL 分岐（:2413-2419）。
  - `humanActedSinceGate(projectDir, verb?): boolean`（定義 **:2479-2499**、export 済み）: シグネチャは `(projectDir, verb?)`。verb 未指定 = 汎用述語（delegate 発行時の issuer grounding が依拠、legacy 一様境界）、verb 指定時は per-delegate GATE slot・verb-scoped（#685）。**fail-open 分岐**: `scanPresenceLedger` が `null`（ledger 読取不能）なら `return true`（:2483、scan-notes の記載どおり — 誇張なし）。verb 指定時はローカル HUMAN_TURN が outstanding なら true（:2493）、無ければ当該 verb の delegate slot（`e.delegVerb === verb` かつ `e.res === "gate"`）を評価。
  - forgery 耐性コメント（:2510-2517）: HUMAN_TURN は UserPromptSubmit hook のみが書き、汎用 audit CLI は mint を拒否。**残余限界**（:2519-2523）: 任意 file-write ツールによる shard 直書きは CLI ガードの対象外（on-disk append-only trail の一般性質）。
- **(b) `amadeus-state.ts` — 接地ゲートと DELEGATED_APPROVAL 監査行の書式**:
  - `assertHumanPresentForGateResolution(pd, content, slug, verb)`（定義 **:1781-1805**）: 3分岐の skip 条件 — (1) `isAutonomousMode(content)` (2) `humanPresenceGuardDisabled()`（env `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`） (3) いずれでもなく `!humanActedSinceGate(pd, verb)` なら `error()` で exit。呼び出しは `handleApprove`（:1841、mutation 前）と `handleReject`（:2163、`"reject"`）。
  - `handleDelegateApproval`（定義 **:1957-2038**）: grounding gate（:1975 `if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd))` → 拒否）、issuer 座標収集（:1983-2007、`issuerSpace=activeSpace` / `issuerIntent=activeIntent` / `issuerShard=auditShardName` / issuer shard 最終 HUMAN_TURN の timestamp を `issuerHumanTs` :1995-1996、HUMAN_TURN 不在なら error :1999-2003）、target 実在検査（:2009-2014、`recordDir` が null か `amadeus-state.md` 不在なら error — scaffold しない）。
  - **DELEGATED_APPROVAL 監査行のフィールド全数**（**:2016-2023** 実測）: **Stage / Issuer Space / Issuer Intent / Issuer Shard / Issuer Human Ts**（+ 任意 **User Input**）。加えて `appendAuditEntry` が Timestamp を付す。DELEGATED_REJECTION 側（`handleDelegateRejection` :2041-2137）は同座標で User Input の代わりに **Feedback**（:2121 付近）。dispatch: `case "delegate-approval"`（:398-399）、`delegate-rejection`（:401）。
- **(c) `amadeus-audit.ts` — イベント allowlist と HUMAN_TURN/DELEGATED_* mint 拒否**:
  - **保護イベント集合** `PRESENCE_PROTECTED_EVENTS = new Set(["HUMAN_TURN","DELEGATED_APPROVAL","DELEGATED_REJECTION"])`（**:766-770**）、heading 版 `PRESENCE_PROTECTED_HEADINGS`（:774-776）。
  - allowlist `VALID_EVENT_TYPES`（:22）に `HUMAN_TURN`（:50）/`DELEGATED_APPROVAL`（:68）/`DELEGATED_REJECTION`（:75）を含む。未知イベントは `Invalid event type:`（:275-277、:308-310）。
  - mint 拒否実装: `append` 経路 `presenceMintRejection(eventType)`（:780-783、`main()` :348 呼び出し）、`append-raw` 経路 `rawPresenceMintRejection(heading, expandedBody)`（:795-810、:364 呼び出し）。設計コメント（:754-765）: trust anchor は in-process `appendAuditEntry` のみ許可、CLI hole は塞ぐが直接 file-write は別 concern（(a) 残余限界と一致）。

### 既定除外の分類データ（scan-notes §3）

- **phase-check ガード**（`amadeus-state.ts:158` 付近）: `const artifactPath = join(rec, "verification", "phase-check-${phase}.md");`（:158、テンプレートリテラル、`${phase}` は `stage.phase` 由来）、不在時 `Refusing to complete the "${phase}" phase boundary: ... does not exist ...`（:160-161）。**どの stage が phase boundary か**は `stage.phase` 値と実際に phase-check を produce する stage で決まりスコープ依存で移動（project.md `phase-check-before-final-approve` と整合）。→ 常任委任の既定除外（不可逆・phase 境界を人間に残す）を実装するなら、この artifactPath 要求ロジックが分類の一次シグナル。
- **Skeleton Stance**（walking-skeleton の状態表現）: 書き込み `handleSetSkeletonStance`（`amadeus-state.ts:548-577`、許容値 `["on","off","scope-dependent"]` :552）が `## Runtime State` 節へ `setOrInsertField(..., "Skeleton Stance", stance)`（**:568**-573）で挿入。**Skeleton Stance は runtime metadata**（Revision Count 同様）で `## Runtime State` の1フィールド。既定グラント除外の対象判定に読み出せる。

### TTL 対照・doctor 可視化・env 前例（scan-notes §4-§6）

- **TTL の完全な対照実装** = `DEFAULT_LOCK_STALE_MS`+`lockStaleMs()`（`amadeus-lib.ts:3629-3638`）: `export const DEFAULT_LOCK_STALE_MS = 10 * 60 * 1000;`（:3629 付近）を canonical に置き、`lockStaleMs()` が `process.env.AMADEUS_LOCK_STALE_MS` を `Number()` parse → `Number.isFinite(n) && n > 0` の妥当性ゲート → 不正/未設定はデフォルトへ fallback。named constant + parse-don't-validate（team.md `verification-numeric-parse` と整合）+ env override + fallback を1関数で満たす。**グラント TTL を実装するなら、要件の数値はこの named constant を file:line で引く（constants-from-code）**。
- **doctor 可視化テンプレート** = `AMADEUS_DEFAULT_SCOPE` チェック（`amadeus-utility.ts:912-932`）: 行モデルは `interface DoctorCheck { pass: boolean; label: string; fix?: string }`（:410-414 付近）、`handleDoctor(projectDir)`（:711）が `results: DoctorCheck[]` を組み立て末尾ループ描画、`process.exit(failed > 0 ? 1 : 0)`。env 未設定は `label: "AMADEUS_DEFAULT_SCOPE (unset — no project default)"` で **pass**、設定済みは valid/invalid で分岐 = **グラント状態（有効/無効・TTL 残）を doctor に1行出す直接テンプレート**（追加先は env 系がまとまる 912 付近の `results.push` 列）。
- **`AMADEUS_OPERATING_MODE` は core で 0 ヒット**: `grep -rn 'AMADEUS_OPERATING_MODE' packages/framework/core/` = **0 件**（scan-notes §4 再確認 実測）。operating mode（solo/team）は core ランタイムでは読まれず team-up.sh 側マーカー。**常任委任グラントが team モードを前提にするなら、モード判定を core で行う設計は前例なし**。env override 記法の前例は真偽値的（`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` → `humanPresenceGuardDisabled()`）か数値 TTL（`AMADEUS_LOCK_STALE_MS`）のいずれか。

### audit taxonomy 同期の留意（scan-notes §2d）

- 正本 `packages/framework/core/knowledge/amadeus-shared/audit-format.md` の `## Event Registry (73 events, 18 categories)`（:11）→ `### Interaction Events (4 events)`（:71）に delegate 系が属する。delegate 行実測: `:79` DELEGATED_APPROVAL（フィールド= Timestamp, Stage, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts, User Input）、`:80` DELEGATED_REJECTION（… Feedback）、`:51` HUMAN_TURN（Timestamp）。**グラント機構が新イベント種別を導入するなら**、`t28-audit-event-sync.test.ts` が taxonomy 3面（`VALID_EVENT_TYPES` / audit-format.md 見出し「73 events」/ `EVENT_HEADINGS`）の同期を強制する点に注意（3面同時更新が必要）。

- 詳細: re-scans/260717-standing-delegation-gran.md

## answer-evidence 検査機構の観測 — sensor 発火面（intent 260716-answer-preemption-guard、2026-07-16、履歴）

bugfix/feature intent（Issue #922 — [Answer] 先取り記入を Write/Edit 時点で機械検知するため、checkQuestionsEvidence の予測ロジックを sensor 発火点へ配線する）の diff-refresh 観測面。出典は本 intent の `inception/reverse-engineering/scan-notes.md`（Developer scan、observed HEAD `e530fc4b13f477e9155d1ec246fd50a49176eadd` 直読の file:line）。手法は diff-refresh（base=`f0f4e0ca4e60fbe36a867015e134346aff0094c4`、祖先・距離124、observed=`e530fc4b`）。**checkQuestionsEvidence（純関数、export 済み）と gate-start ガード配線は base〜HEAD 区間で既に着地済み（#1101/#1106）、sensor 機構は区間内で未変更 = 既存実装がそのまま本 intent の利用対象**。

### 予測ロジック本体は純関数として抽出済み（`amadeus-lib.ts`）

- 型 `QuestionsEvidence`（**:1144-1146**）= 判別ユニオン `{kind:"pass"; reason:"no-file"|"no-answer-tag"|"answer-blank"|"evidence-present"} | {kind:"fail"; reason:"no-evidence"|"unparseable-timestamp"}`。
- `checkQuestionsEvidence(questionsPath: string): QuestionsEvidence`（**:1173**、**export 済み**、引数はファイルパス1本）。判定列（:1174-1194）: no-file → no-answer-tag → answer-blank（未記入/N/A/単一括弧プレースホルダ）→ evidence-present（E-code or 承認行に parseable ISO TS）→ 承認行はあるが TS 不正なら fail:unparseable-timestamp → それ以外 fail:no-evidence。
- module-scope ヘルパー（非 export）: `isFilledAnswer`（:1154）、`hasParseableApprovalTimestamp`（:1163）、正規表現定数 `ANSWER_TAG_RE`（:1148）/`ECODE_RE`（:1149）/`ISO_TS_RE`（:1150）。
- 設計コメント（:1140-1143）: read-only、呼び出し側が失敗の扱いを決める。**先取り検知本体は既に sensor から再利用可能な純関数** — 新規予測ロジックの再実装は不要。

### 既存の消費側 = gate-start ブロッキングガード（`amadeus-state.ts`）

- import（:40）で lib から取り込み。`handleGateStart`（:1690）内の E-OC1 evidence ゲート本体は :1710-1733。
- ローカル cutoff 定数 `GUARD_CUTOFF_YYMMDD = 260716`（**:1721**、handleGateStart 内スコープ、export/module-scope ではない）。日付導出は record dir 名先頭 YYMMDD（`:1722`）、`enforced = intentDate >= GUARD_CUTOFF_YYMMDD`（:1723）。
- `questionsPath = join(rd, stage.phase, slug, `${slug}-questions.md`)`（**:1725**）→ checkQuestionsEvidence（:1726）→ fail:no-evidence/unparseable-timestamp で `error()`（fail-closed、checkbox 遷移前）。cutoff の趣旨（:1715-1720）: live corpus 59/111 questions は E-OC1 規約以前 → 遡及適用回避。

### sensor 追加が hook 改修なしで成立する構造（A1 = YES）

- dispatcher `amadeus-sensor.ts`: fire は id-agnostic — per-sensor script は `--stage`/`--output-path`（+ threaded flags）を受け、stdout JSON の `pass`（boolean、:576）/`findings_count`（readFindingsCount :693-699）だけを汎用的に読む。**新 sensor 追加 = manifest 1枚 + script 1本 + stage の `sensors:` へ id 追加で完結**。per-sensor script `amadeus-sensor-required-sections.ts` は `./amadeus-lib.ts` から `errorMessage,parseBoltDag` を import する前例（:1-3）= 新 script が checkQuestionsEvidence を lib から import する前例が成立。
- manifest frontmatter（`sensors/amadeus-required-sections.md` :1-24）: `id`/`kind`/`command`（`{{HARNESS_DIR}}` プレースホルダ）/`default_severity: advisory`/`matches`/`input_schema`/`output_schema`/`timeout_seconds`。`matches` が capability filter で compile 時に SensorResolution へ verbatim スナップショット。
- stage `sensors:` → `sensors_applicable` 解決（`amadeus-graph.ts`）: `resolveSensorsForStage`（:704-728）が stage.sensors 各 id を `loadSensors()` Map で引き（未知 id は compile 時 throw = fail-loud）、`sensor.manifest.matches` を verbatim コピー、宣言順保持。requirements-analysis は既に `sensors: [required-sections, upstream-coverage]` を宣言（:33-35）。
- PostToolUse hook `.claude/hooks/amadeus-sensor-fire.ts`（matcher = Write|Edit）: Write/Edit の絶対 `file_path`（:76）を、Current Stage の `sensors_applicable` 各 entry の `matches` glob と `Bun.Glob(entry.matches).match(filePathNorm)`（:193-194）で照合、マッチ時のみ dispatcher を spawn（:209）。常に exit 0（:272、G5 advisory）。
- **A1 実測**: questions ファイルの絶対パス（`.../amadeus/spaces/<space>/intents/<record>/.../<slug>-questions.md`、`/intents/` セグメント含む）は既存 required-sections の `matches` glob `**/{amadeus-docs,intents}/**` に `Bun.Glob` で match=true（`bun -e` で実測）。かつ questions 書込みは producing stage が Current Stage の時点（gate 前）に起きる → 発火経路は既に成立（required-sections は questions 書込みでも発火中）。**hook 側の改修は不要** — 既存 per-entry dispatch が新 entry をそのまま回す。

### 相補関係・実装時要判断（要件へ委譲）

- gate-start ガード（ブロッキング、fail-closed、unpark→gate-start 時点の1回）と sensor（advisory、exit 0、書込みごとの連続チェック）は**タイミングが異なり相補**。ブロッキングは gate-start が担い、sensor は先取りを早期に loud 化する。
- cutoff（GUARD_CUTOFF_YYMMDD=260716）を sensor 側へ持たせるかは要件判断（sensor は fail-open advisory ゆえ遡及ブロック懸念は弱い）。construction 段の questions パスは `<record>/construction/<unit>/<slug>/...` になりうる点、matches を狭める（`*-questions.md`）場合の Bun.Glob と dispatcher の bespoke globToRegex（amadeus-sensor.ts:835）の両エンジン整合（hook コメント :183-189 が `**/<seg>/**` 形を load-bearing と明記）は実装時に実測確認。
- 詳細: re-scans/260716-answer-preemption-guard.md

## gate-start 検査挿入面の観測（intent 260716-eoc1-gate-check、2026-07-16、履歴）

- handleGateStart（amadeus-state.ts :389 dispatch / :1661 定義）— validateSlugInState 後・setCheckbox 前が検査挿入点、error() fail-closed・withAuditLock アトミック
- questions ファイル様式 `<record>/<phase>/<stage>/<stage>-questions.md`（不在は正常）、L1 証跡（承認 ISO タイムスタンプ行）は機械抽出可能（本日8ファイル実測）
- 詳細: re-scans/260716-eoc1-gate-check.md

## テストランナー失敗計上機構の観測（intent 260716-covci-flake、2026-07-16、履歴）

- coverage:ci = --ci --coverage（package.json:16）、--ci = smoke+unit+integration のみ（run-tests.ts:187-192、e2e 非実行）
- 失敗計上は per-file .meta → aggregateTierResults（:465-479、:475 で failedFiles++）。resultsDir は run ごと mkdtemp（:323/:327）— 並行・入れ子 run 間の交差汚染経路なし
- SUMMARY（:900-925）は総数のみで per-scope 失敗表なし。size matrix は失敗と無関係。exit = failedFiles（:1207、t112 ピン）
- 入れ子 spawn テスト（t05 等）は子 run の `--- FAIL:`/`RESULT: FAIL` 行を親 stdout へ流す — grep/目視のスコープ帰属誤計上の温床
- 詳細: re-scans/260716-covci-flake.md

## ステージ diary 生成機構の観測（intent 260716-diary-ensure-exists、2026-07-16、履歴）

- memory.md の決定的生成コードは不在 — orchestrate `next` は memory_path 文字列を directive に載せるのみ（amadeus-orchestrate.ts:1162、memoryPathFor :591）
- テンプレートは knowledge/amadeus-shared/memory-template.md（t100 ガード）に実在し、conductor.md:66-75 が copy 手順（Idempotent / never overwrite）を conductor 義務として規定
- STAGE_STARTED 発火点は5経路（state:1370 advance / jump:585 / utility:2511,2575,2596 init / utility:2806 birth / orchestrate:2756 --single）+ STAGE_STARTED 非経由の復旧経路あり — 全経路が通る単一点は next の run-stage directive 発行
- 詳細: re-scans/260716-diary-ensure-exists.md

## テスト size 分類機構の観測（intent 260716-t224-size-large、2026-07-16、履歴）

bugfix intent（Issue #1059 — `t224-upstream-v2-migration-cli.test.ts` が wall-clock drift ゲートで `declared=medium measured=large`、35-41s で恒常 FAIL）の diff-refresh 観測面。出典は本 intent の `inception/reverse-engineering/scan-notes.md`（Developer scan、observed HEAD `720b0145b4b396b5c146b5c7271ff83f1da65243` 直読の file:line）。手法は diff-refresh（base=`e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75`、祖先・距離26、observed=`720b0145b`）。**フォーカス3面（size 分類器正本・ランナー drift 報告部・t224 本体）は区間26コミットで無変更、欠陥は observed に現存**。主実測は Issue #1059 の e4/e1 クロスレビュー（2名確認済み）で完了、本節はその転記＋独立追認。

### wall-clock drift 分類のデータフロー（`tests/lib/test-size.ts`）

- 帯定義 `WALL_CLOCK_BANDS = { smallMaxSeconds: 1, largeMinSeconds: 30 }`（**:89**）。下端 inclusive / 上端 exclusive: `[0,1)`=small、`[1,30)`=medium、`[30,∞)`=large。
- `sizeFloorFromDuration`（**:95-99**）: 実測 duration → SMALLEST 整合 size。t224 の 40s → **dynamicFloor=large**。
- `detectWallClockDrift(effectiveDeclared, dynamicFloor)`（**:113-121**）: `SIZE_ORDER[floor] > SIZE_ORDER[declared]` のとき**のみ** `{kind:"wall-clock"}` を返すスマートコンストラクタ（正しい非対称、floor≤declared は `{kind:"none"}`）。`detectWallClockDrift(medium, large)` → drift 発火。
- `parseSizeAnnotation`（**:279-287**、走査域 先頭40行 `.slice(0,40)` :280）: 先頭コメント域の `// size: <value>` を先頭一致で読む。t224 は size ヘッダ無し → `{declared:null}`。
- `buildMeasuredRecord`（**:141-161**）: `effectiveDeclared = annotation.declared ?? classification.size`（**:149**）。t224 は未宣言（null）なので **effectiveDeclared = static 信号分類の値**。

### 「declared=medium」の正体（ハードコード既定ではない）

- t224 先頭40行 grep: `// covers: cli:amadeus-migrate(dry-run,apply)`（:1）のみ、`// size:` は **0件（未宣言）**。
- static 分類（`classifyTestSize` :49-62 / `SIGNAL_PATTERNS` :35-40）: t224 は `spawnSync`（:8、spawn→medium）＋ `node:fs` の `mkdtempSync/readFileSync/writeFileSync`（:15-25、filesystem→medium）を含み network（large）は無い → **classification.size=medium**。ゆえに drift 行が表示する `declared=medium`（run-tests.ts `declared=${r.drift.declared}` **:977**、レポート生成 :944-969）は**未宣言時に static 信号分類が返す medium**であって既定定数ではない。

### 実測 wall-clock（第4実行系での large 帯到達）

`/usr/bin/time -p bun test tests/integration/t224-upstream-v2-migration-cli.test.ts` → **58 pass / 0 fail、`Ran 58 tests across 1 file. [40.40s]`、real 40.43s**（exit 0）。起票 35-37s（coverage あり×2）・e4 41s（coverage 有無×2）・e1 42.6s（coverage なし）に続く第4実行系で large 帯（≥30s）に単独・無負荷で到達 → **declared と実測の恒常乖離**を追認、coverage 仮説の反証（e4/e1）も追認（coverage 有無で帯不変、30s 閾値に対しマージン十分）。

### 既習アノテーション様式と修正方針

- `tests/` に `// size:` 宣言は **45ファイル**。medium 既習例 = `tests/unit/t207-worktree-base-freshness.test.ts:2` / `t209-worktree-read-anchor.test.ts:2`（先頭コメント域2行目）。**`// size: large` 宣言済みテストは repo に 0件**（t224 が最初の large になる）。
- **最小修正 = t224 先頭コメント域へ `// size: large` の1行追加** → `parseSizeAnnotation` が large を返し → effectiveDeclared=large → `detectWallClockDrift(large, large)` 同値で strictly-greater 不成立 → `{kind:"none"}` → drift 解消。機構（test-size.ts / run-tests.ts）無改修、対象は `tests/` 直下で dist 再生成非関与。分割案は 40-43s に対し過剰。blame `1a39edea2`（2026-07-14、#962 upstream v2 移行）、origin:bootstrap 非該当、**原因の所在=実装**（30s 超テストへの size 宣言漏れ）。落ちる実証は既存 t-test-size-drift/dynamic ゲート側にあり新設不要。
- **同型棚卸し**: 「未宣言かつ 30s 超」の他テスト有無はフル `bash tests/run-tests.sh --ci` の `tests/logs/test-size-report.json` 集計を要し本区間では確定不能 → **本 intent は t224 のみ対象、全数棚卸しは別 Issue 候補**。

### アーキテクチャ視点（Architect 合成）

size 分類機構は**3層の floor モデル**で設計されている。(1) **static 信号分類**（`classifyTestSize` :49-62、`SIGNAL_PATTERNS` :35-40）はソーステキストの API シグナルから size を推定する — 実行不要の安価な既定であり、宣言漏れテストにも下限を与える安全網。(2) **dynamic wall-clock floor**（`sizeFloorFromDuration` :95-99）は実測実行時間から size 下限を導出する — 「実際に large 帯で走るなら large と分類されるべき」という実測 truth。(3) **宣言アノテーション**（`parseSizeAnnotation` :279-287）は作者の明示意図で、`effectiveDeclared = annotation.declared ?? classification.size`（:149）により static 既定を**上書き**する権威層。`detectWallClockDrift`（:113-121）は「宣言/既定（effectiveDeclared）が実測 floor を下回る」ときのみ strictly-greater で drift を発火させる非対称ゲートであり、実測を天井ではなく floor として扱う設計 — 速く走った分には寛容、遅れた分だけ是正を要求する。t224 の欠陥は機構の破綻ではなく、**宣言層が欠けたため static 既定 medium が権威値に昇格し、実測 floor large と構造的に乖離した**もの。よって修正は宣言層への1行注入で、機構3層は無改修が正しい。

**large 初宣言の意味**: t224 は repo 初の `// size: large` 宣言（V2 反証 grep で 0件を確認済み）。これまで large は dynamic floor が実測から導く「発見される」size でしかなく、作者が意図として明示する経路は理論上存在しても未使用だった。t224 の宣言はこの権威層の large 分岐を初めて実行し、「重いテストは重いと宣言する」idiom を medium 既習例（t207/t209 :2）に続けて large へ拡張する。将来 large テストの標準アノテーション位置（`// covers:` 直後の :2）の初例にもなる。


## §13 learn-candidate label 面の観測（intent 260716-s13-label-clarity、2026-07-16、履歴）

bugfix intent（Issue #609 — §13 learn candidates の選択肢が内部 ID 単独表示になる）の diff-refresh 観測面。フォーカスは **docs / プロトコル prose のみ**（コード欠陥ではない）。出典は本 intent の `inception/reverse-engineering/scan-notes.md`（Developer scan、observed HEAD `e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75` 直読の file:line）。手法は diff-refresh（base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`、祖先・距離28、observed=`e97fdb6fc658d4cd36d4c30fc460c5b7e70e8c75`）。**フォーカス3面は区間28コミットで無変更、§13 仕様は現行で正しく規定済み**。

### §13 option label の規定所在（`stage-protocol.md`）

- 編集正本 = `packages/framework/core/amadeus-common/protocols/stage-protocol.md`（`{{HARNESS_DIR}}` プレースホルダ形）。`.claude/` ・ `.codex/` ・ `dist/<harness>/…` は生成ツリー（`bun scripts/package.ts` + `promote:self` 出力）。両者は `{{HARNESS_DIR}}` 置換差で **byte 非同一**だが、**§13 label 文言(L960)は同一**。
- **§13 Step 3（:960）**: 「render one option whose `label` is the candidate `summary` (verbatim) and whose `description` names the routed destination …」 — option label = candidate summary verbatim を既定化済み。Issue #609 の `Persist c5 only` は ID 単独ラベルで **L960 違反**＝ orchestrator(LLM) のプロトコル逸脱の一事例（決定的機構欠陥ではない。blame: afdbdc623 / 2026-07-07 bootstrap から現文言）。

### option-label 規定の同型面棚卸し（enumeration-completeness）

`stage-protocol.md` 内の option-label 規定は4箇所: L11(annex 参照)・L19(「Never summarize User Input」＝選択結果 verbatim 記録の別クラスタ)・L577(監査様式の User Input 捕捉、別クラスタ)・**L960(§13 learn-candidate を summary verbatim でラベルする唯一の規定)**。否定例(`❌ Persist c5 only`)を足すべきは **L960 単独**。

### learnings.ts surface 出力契約（`amadeus-learnings.ts`、正本と `.claude/` は byte 同一）

- `SurfaceCandidate`（:96-103）: `id`(:97)/`source_heading`(:98)/`ts`(:99)/**`summary`(:100)**/**`context`(:101)**/`default_scope`(:102)。candidate 構築 :244-249、JSON 出力 :262（`SurfaceOutput.candidates` :115）。**意味あるラベルの材料(summary/context)はツール側に揃っており、欠陥はレンダリング層の遵守のみ**。

### question-rendering annex（`.claude/skills/amadeus/question-rendering.md`）

- AskUserQuestion のフィールドマッピング annex（`options[].label` :19、選択結果 verbatim 捕捉 :62-63）。**§13・candidate・summary への言及 0件** — 候補ラベル中身は規定せず、§13 label 規定は stage-protocol.md L960 に一元化されている。

### 修正方針（Issue #609、bug/P3/S4-MINOR）

(a) §13 Step 3(L960) に否定例明記 = docs 強化（本 intent スコープ内・クローズ条件になりうる、対象 L960 単独） / (b) レンダリング前 `label ⊇ summary` 検査の軽量ガード = 新機構で bugs-only スコープ外。

### アーキテクチャ視点: prose 契約における否定例の設計位置づけ（後続 design 向け）

- **欠陥クラスの所在**: この不具合は決定的機構の欠落ではなく、正の規定（L960「label = candidate `summary` verbatim」）が既にありながら orchestrator(LLM) がそれを逸脱した一事例。ツール層（`amadeus-learnings.ts` surface）は L958 で「surfaced verbatim — no paraphrase」の JSON を出し、ラベル材料（`summary`/`context`）を欠かさず供給しているため、逸脱点はレンダリング層（LLM が JSON→AskUserQuestion option へ写す一手）に限局する。修正の設計対象は「機構」ではなく「prose 契約の遵守可能性」。
- **否定例の設計上の役割**: 修正方針(a) が L960 に足す `❌ Persist c5 only` は、正の規定を反復するのではなく **既知の逸脱形（ID 単独ラベル）を名指しで禁止**する契約強化である。正の指示のみでは逸脱形が指示空間の外側に残り LLM が再現しうるが、否定例は逸脱形を契約の内側へ取り込んで閉じる。docs-only 修正が「決定的ガード不在（grep 0件）でも本 Issue のクローズ条件になりうる」根拠はここにある。
- **配置の一意性契約**: 否定例は §13 learn-candidate の option label を規定する唯一の行（L960）にのみ置く。L19/L577 は post-selection capture（ユーザー選択結果の verbatim 記録）の別クラスタで、候補ラベルの**構築**規定ではないため否定例を重複配置しない（enumeration-completeness の結論＝配置は L960 単独）。後続 design は「否定例の配置箇所」を受け入れ基準に固定する際、この一意性（L960 のみ・L19/L577 除外）を明示すること。


## t05 並列フレーク観測面 — 260716-github-issue-912(2026-07-16、履歴)

Issue #912(t05 planted-failure ケースが高負荷ホストで `--parallel 4` 下 120005ms タイムアウト間欠 FAIL、labels=`bug / P3 / S4-MINOR`)のフォーカス面。出典は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260716-github-issue-912-tests-s.md`(file:line は observed HEAD `8e8cc9b1` 直読)。diff-refresh base `e55cc25`→observed `8e8cc9b1`(祖先性実測 exit 0、距離37)で**フォーカス3ファイル(`tests/smoke/t05-run-tests-parallel.test.ts`・`tests/run-tests.ts`・`tests/run-tests.sh`)の区間 diff は空** — 現行 worktree の行番号は Issue #912 実測(2026-07-11)時点とバイト同一(「実行コード変更なし、負荷起因」という Issue 見立てと整合)。

### planted-failure ケースの機序(`tests/smoke/t05-run-tests-parallel.test.ts`)

- 該当ケース = **test 8「planted failure propagates under --parallel 4 (RESULT: FAIL, non-zero exit)」= L411-438**。契約(コメント L406-410 明示): 「§6-E: the failure FIRES」= 本物の `not ok` が `--parallel 4` 下で SUMMARY を `RESULT: FAIL` に反転させ非ゼロ exit を返す(`run-tests.sh:818` の失敗伝播)。happy path では等価・強化にならないため実失敗の伝播を必須検証。
- 機序(L412-428): 冒頭で `tests/integration/tZZ-planted-fail-t05.test.ts` を `expect(false).toBe(true)` 本体で書き出し(L413-420)、`run(["--integration","--filter","t12-state|tZZ-planted-fail-t05","--parallel","4"])`(L422-428)を実行。`run()`(L104-125)は `spawnSync("bash",[RUNNER,...args])`(L113)で **`bash tests/run-tests.sh` を入れ子 spawn**。フィルタが2ファイルにマッチし、内側ランナーが各ファイルにつき `bun test` を更に spawn(**二重 spawn: bun→bash→bun×2**)。
- **120s タイムアウト定義箇所 = `const PER_TEST_TIMEOUT = 120000;`(L161)**。これは bun の **per-test タイムアウト**で `test(name, fn, PER_TEST_TIMEOUT)` の第3引数として渡る(test 8 は L438 で適用)。**`run()` 内 `spawnSync` には `timeout` オプションが無い**(L113-120 のオプションは `cwd`/`encoding`/`env`/`maxBuffer` のみ)。ゆえに 120s を食い切って FAIL させるのは spawnSync のプロセスタイムアウトではなく、**外側 bun が test() 全体を 120s で打ち切る per-test timeout**。内側ランナーは 120s に無頓着で走り続け、外側 bun が先にタイムアウトを宣告する構造。
- 二重 spawn の支配項: `tests/integration/t12-state-fixture-validation.test.ts` はヘッダ L16 に「zero tool spawn, zero LLM, zero tokens」と明記、spawn grep = 0。t12 側は軽量な in-process fixture 検証で、入れ子コストの支配項は **run-tests.ts 起動オーバーヘッド + cold bun 起動 ×2 の直列化**。高負荷時はこれらが CPU 待ちで伸び 120s 予算を超過。

### run-tests.ts の並列制御の実態(負荷適応 seam 皆無)

- **並列度既定 = 1**(`args.parallel` 既定、L163)。`--parallel|-P` は `/^[1-9][0-9]*$/` で正整数検証し `Number(value)` を代入(L223-233)。**CPU 由来の自動決定は無い**(nproc/os.cpus 参照なし)。
- **worker プール = `runFileBand`(L839-862)**。`serialFiles` を直列実行(L845)後、`effectiveParallel<=1` なら残りも直列(L846-849)。並列時は `Set<Promise>` のスライディングウィンドウで `executing.size >= effectiveParallel` になったら `Promise.race`(L857-858)で1つ空くのを待つ素朴なセマフォ。各ファイルは `runBunTestFile`(L693)→`runSpawnCapture`(L647-691)→`spawn(cmd,cmdArgs,{cwd,env,stdio})`(**L653-657**)。
- **テスト子プロセス spawn には timeout オプションが無い**(L653-657)。既存の `timeout:` は補助 spawn 2箇所のみ(`commandExists` の `--version` プローブ `timeout: 30_000`、L360-363)で対象外。**個々の `bun test` 子には時間上限が掛かっていない**。
- **負荷適応機構の有無**: `grep -nE 'os\.cpus|loadavg|nice|AMADEUS_.*PARALLEL|settle|adaptive'` = **NONE FOUND**。load-average 参照・nice 降格・並列度の環境変数上書き・収束待ちの seam はいずれも不在。smoke/unit は L890 で強制直列だが、本件の内側ランナーは `--integration` なので `args.parallel=4` がそのまま効く。
- t05 は smoke 層(`tests/smoke/`)配置ながら **28 test を持ち複数ケースが per-test 120s(L161)を要求する重量級**で、smoke 層(本来軽量ガード)では例外的に重い。これが「smoke 段で 1 fail により全体 abort」(Issue 実測)の被害拡大要因。

### 先行修正3クラス(同クラスフレークの前例)

- **#819**(`e9c49a4ae`): case 15 が `-P 8` フル負荷でフレーク(linter sensor が実 eslint を spawn、`amadeus-sensor.ts:470`、Findings 1→0 間欠)。対策 = (a) --ci 段で spawn を hermetic stub 化(`AMADEUS_T92_FINDINGS` 注入で両極決定化)、(b) 実 eslint ラウンドトリップを assertion 同一のまま `tests/e2e/t92-linter-eslint-roundtrip.test.ts`(--release 段)へ**物理移設** = 重い入れ子 spawn を高頻度 tier→低頻度 tier へ隔離。**#912 に最も近い**(重い入れ子 spawn が高負荷で予算超過)。ただし #912 の入れ子は外部プロセスでなく **run-tests.sh 自身の再帰**。
- **#831**(`f09e84128`): t76 が並列で共有 audit-lock 競合によりフレーク。対策 = run 毎に `AMADEUS_LOCK_BASE_DIR` でロック基底を隔離 = 共有リソース競合の分離(タイムアウトではなく競合)。
- **#877**(`8922e8002`): in-process の clone-id/audit-shard キャッシュを test 間でリセット = プロセス内共有状態のリセット。
- 整理: #831/#877(+参考 #741 `fd4009671` の wallclock 順序固定)は「競合/共有状態/タイミング依存」を断つ**決定化**、#819 は「重い入れ子 spawn を tier 移設で隔離」。**#912 は #819 型**だが隔離先が「別 tier」か「spawn 除去」かで手が分かれる。

### 修正3案の実現可能性評価(scan-notes 転記)

- **案A(タイムアウト負荷適応)**: `PER_TEST_TIMEOUT`(L161)を環境変数(例 `AMADEUS_T05_TIMEOUT_MS`)で延伸可能に、または run-tests.ts の spawn(L653)へ `timeout` 配線。**実現可能性 中**。t05 側定数外出しは surgical(1定数)だが**症状を隠すだけで根本(入れ子コストの負荷依存)は残る**。延伸は真の hang 検出も遅らせるトレードオフで、ノルム P2(検証劇場回避)と緊張。**単独では非推奨、安全網に留めるのが妥当**。
- **案B(#819 型の tier 隔離)**: 重い入れ子 spawn ケースを smoke→e2e/--release へ物理移設、assertion 同一で温存。移設先の cli-spawner 登録(EXPECTED_NONE_TO_CLI)+ coverage registry 再生成が必須(integration-registry-regen ノルム)。**実現可能性 中〜高**。前例確立・手順明文化済みだが、t05 は「smoke tier の parallel 契約ガード」であり失敗伝播ケースだけ切り出すと1ファイル内のケース分割になり設計意図(--parallel 契約を1箇所で保証)がやや分散。**有効だが構造分散のコスト**。
- **案C(入れ子 spawn 分離/削減 — 本命)**: (c1) test 8 のフィルタを `t12-state|tZZ-planted-fail-t05`→**`tZZ-planted-fail-t05` 単独**に絞り、入れ子で走る bun test を2本→1本へ半減(L422-428 の1行 diff、契約=失敗反転は planted 1本で完全保存)。t12-state は失敗伝播契約に非寄与(interleaving 契約は別ケース test 6 = L334-365 が既にカバー)。(c2) 併せて内側 `--parallel 4` を削るか環境変数上書き seam(run() 経由)で CI 時 1 に落とす。**実現可能性 高**。最小・surgical で入れ子コストの支配項(cold bun 起動数)を直接削減、副作用リスク最小。ただし「--parallel 4 下の並列 race」観点をどこまで残すかは要件で確定すべき。
- **総合**: 案C(フィルタ最小化=入れ子コスト削減)を主軸に、必要なら案A(timeout の環境変数 seam)を安全網併用が bugfix スコープ内で surgical かつ根本(負荷依存の入れ子コスト)に効く。案B は前例強だが構造分散コストあり、案C 不足時の代替。最終選択は requirements/選挙で確定。
- **入れ子 spawn なしで同契約を検証できる構造の実在可能性**: 集計反転ロジック(SUMMARY 生成 = `run-tests.sh:809-824`)を fixture/直接呼びで検証する seam があれば入れ子 spawn を全廃できるが、`run-tests.sh` は bash スクリプトで in-process seam を持たず(t05 冒頭 L11-19「Mechanism: cli … nothing to import」)、**現状 CLI 境界でしか観測面が無い** — 直接呼び化は run-tests.sh の TS 化/ロジック抽出を要し bugfix スコープを超える。

### E-L71(fanout-load-settle)との関係

- E-L71(team norm、`3392f962a`/#913 で persist)=「fan-out 直後のフルスイート統合検証はホスト負荷収束を待つか並列度を落とす」は**運用手順**であって、テストコード側に「負荷収束待ち/並列度低減」を強制する **seam は現状不在**(上記 NONE FOUND が裏付け)。構造化余地: (a) 内側ランナー呼び出しの `--parallel` を環境変数で上書き可能にする seam(run() 経由)、(b) run-tests.ts の spawn(L653)に timeout オプションを配線し子の暴走を loud に打ち切る seam。いずれも現状は配線ゼロからの新設。


## parser/checkbox 欠陥面の観測（intent 260715-parser-checkbox-fixes、2026-07-16、履歴）

bugfix intent（#1013 / #1015）の diff-refresh 観測面。出典は本 intent の `inception/reverse-engineering/scan-notes.md`（Developer scan、observed HEAD `6495e03a12d9e7149c2e80b59f171a90607a2d2c` 直読の file:line）。手法は diff-refresh（base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`、祖先・距離65、observed=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`）。**区間65コミットにフォーカス欠陥の修正は存在せず、両欠陥は observed に現存**。編集正本は `packages/framework/core/tools/`（`.claude/tools/*` は byte 同一 self-install コピー、`dist/<harness>/…` は build 出力）。

### 欠陥面1: practices-promote parseRules（`amadeus-state.ts`、#1013）

- `parseRules`（:2556-2561）は `handlePracticesPromote` 内のローカル arrow（export なし）。フィルタは「非空・非コメント（`<!--`）・非見出し（`#`）」のみで、**`ALWAYS …` / `NEVER …` 契約プレフィックスを検証しない**。
- 呼び出し元は2箇所のみ: `mandatedRules = parseRules(mandatedDraft)`（:2570）/ `forbiddenRules = parseRules(forbiddenDraft)`（:2571）。
- 処理フロー: draft 存在確認・読込（:2493-）→ `extractMarkdownSection(…, "## Mandated"/"## Forbidden")`（:2562-）→ parseRules（:2570-2571）→ `appendUnderHeading` で `${rule} (affirmed ${today})` を見出し配下へ append（:2574-2601）→ project.md 先・team.md 後に write（:2610-）→ 失敗経路で `PRACTICES_OVERRIDE` audit。
- stage 契約: `practices-discovery.md:101`「`## Mandated`（rules with `ALWAYS …` format）… One rule per line」。散文行が混入すると契約非接頭のまま append され契約違反。

### 欠陥面2: scope-change checkbox 再構築（`amadeus-utility.ts` / `amadeus-lib.ts`、#1015）

- **所在**: `handleScopeChange`（:3136、verb `scope-change`、dispatch :4070-4071）。別関数 `handleRecompose`（:3306、verb `recompose`）は suffix-only でマーカー不変（t194 が検査、scope-change は対象外）。
- 再構築フロー: `parseCheckboxes(content)`（:3195）→ `existingMap`（:3196）→ phase ループ内 `existingMap.get(stage.slug)`（:3226）→ **三項マーカー**（:3228-3230）→ ヘッダ書き戻し（:3237-3239）。
- **三項の崩落**（:3228-3230）: `existing.state === "completed" ? "x" : … "in-progress" ? "-" : … "skipped" ? "S" : " "`。completed/in-progress/skipped の3状態のみ明示し、**awaiting-approval / revising / pending は末尾 `[ ]`（pending）へ落ちる**。
- **入力は正しい**: `parseCheckboxes`（`amadeus-lib.ts:3395`）の regex `[ xSR?-]` と switch が6状態（`?`→awaiting-approval、`R`→revising 含む）を復元。existingMap は忠実で、崩落は再構築三項側。
- **副次 drift**: 再構築ヘッダ `stageProgressHeader`（:3238）が4状態表記（`[?]`/`[R]` 欠落）。正本テンプレ :2748 は6状態表記。
- **状態型の正本**（`amadeus-lib.ts`）: `CheckboxState`（:58、6状態）/ `CHECKBOX_MAP`（:60-67、state→marker 1正本）/ `CHECKBOX_REVERSE`（:69-76、逆写像）。正準マーカー構築は `CHECKBOX_MAP[newState]`（:3435）。#1015 の三項はこれを使わず手書き列挙。

### 手書き marker 構築の同根棚卸し

state→marker 文字列を手書き構築するサイトは2箇所: `amadeus-utility.ts:3229`（**欠陥**、6→4崩落）/ `amadeus-utility.ts:2656`（`isInit ? "[x]" : "[ ]"`、初期化文脈で既存状態なし＝**非欠陥**）。正準 `CHECKBOX_MAP` 経路は `amadeus-lib.ts:3435` の1箇所。surgical 修正方向は 3229 を CHECKBOX_MAP 参照へ置換。

### 既存テスト（両欠陥とも未カバー）

- #1013: `tests/integration/t75.test.ts` は practices-promote を検査するが fixture は全行 ALWAYS/NEVER 整形済みで、契約非接頭行の拒否ケース不在。
- #1015: `tests/unit/t194-recompose.test.ts` は別関数 `handleRecompose`（marker untouched）を検査。scope-change × `[?]`/`[R]` 保存を結合するテストは全域 grep で0件。

### アーキテクチャ視点: 書き手境界と対称性契約（後続 requirements/design 向け）

- **書き手境界**: 両欠陥は state を書く別々の境界に属するが同型。#1013 `handlePracticesPromote`（`amadeus-state.ts`）は **memory 層（team.md/project.md のルール）への書き手**で、draft 契約書式（ALWAYS/NEVER）を検証せず散文を永続ルール化する。#1015 `handleScopeChange`（`amadeus-utility.ts`）は **state ファイル（Stage Progress チェックボックス）への書き手**で、6状態を4状態へ縮約して書き戻す。いずれも「入力（memory draft / `parseCheckboxes` 復元）は正しいが、書き手側が契約を落とす」非対称欠陥。
- **後続が受け入れ基準に固定すべき対称性契約**（symmetric-pair-review / team.md PM1-6 の適用）:
  - #1015 = **parse⇔rebuild の6状態対称**: 読み手 `parseCheckboxes`（`amadeus-lib.ts:3395`、6状態を全復元）と書き手の再構築三項（3状態のみ）が非対称。正準 `CHECKBOX_MAP`（:60-67、6状態1正本）を rebuild 側でも唯一の写像源とし、ヘッダ凡例も正本テンプレ（:2748、6状態）へ一致させて対称を回復する。requirements/design は「parse が受理する全状態を rebuild が保存する」を検証可能な受け入れ基準に固定すべき。
  - #1013 = **stage 契約⇔parser の検証対称**: 入力側の stage 契約（`practices-discovery.md:101`「ALWAYS … format / One rule per line」）が要求する書式を、書き手 `parseRules` が出力側で検証しない非対称。契約プレフィックス検証を `parseRules` 側に置き、契約非接頭行を拒否/隔離して対称を回復する。design は「契約違反行が memory 層に着地しない」を受け入れ基準に固定すべき。


## harness port 開放性の観測面(intent 260715-opencode-cursor-harness、2026-07-16、履歴)

opencode / Cursor harness port(Issue #626)のフォーカス面。出典は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260715-opencode-cursor-harness.md`(file:line は observed HEAD `6a23b0ec` 直読)。diff-refresh base `cf3dc88`→observed `6a23b0ec`(距離65、祖先性実測済み)でフォーカス面のハーネス開放性契約は全て不変(下記温存判定参照)。

### open-set(自動発見)3層 — 新ハーネスが「編集ゼロ」で乗る面

| 層 | seam | 所在(file:line) | 開放機構 |
| --- | --- | --- | --- |
| build ターゲット発見 | `discoverHarnessNames()` | `scripts/package.ts:68-73` | `packages/framework/harness/` を `readdirSync` し `manifest.ts` を持つ dir のみ返す(sort 済み)。ハーネス集合はハードコードされていない(:63-67 コメント)。既定ターゲット=`discoverHarnessNames()`(:764)、manifest 実在フィルタ(:769) → `harness/opencode/manifest.ts` + `harness/cursor/manifest.ts` を置けば package.ts 無編集で両者をビルド。`--check` ドリフトガードも自動で効く。 |
| runtime のハーネス dir 解決 | `harness.json`(`{harnessDir, rulesSubdir}`) | `scripts/package.ts:438` writeHarnessData が生成、runtime は install 済み `harness.json` で解決 | 実 install の harnessDir/rulesSubdir 解決は `harness.json` が権威。`amadeus-lib.ts:114` `KNOWN_HARNESS_DIRS`/`:170-172` `KNOWN_RULES_SUBDIR` は **AMADEUS_HARNESS_DIR test-seam と fallback 専用**(:109-114,:162-168 コメント明記)。 |
| skills 生成 | runner-gen | `amadeus-runner-gen.ts:60,63`(出力先=`<harnessDir>/skills/`) | `<harnessDir>/skills/` に skills を置く規約なら `skipRunnerGen=false`(省略)で stage/scope runner を自動生成。`.agents/skills/` 等の特殊探索なら codex 同様 `skipRunnerGen=true`(`manifest-types.ts:119`)+ `emit.ts` で自前生成。 |

manifest 契約は `scripts/manifest-types.ts:79-122`(HarnessManifest 全12フィールド)。新ハーネスは `harnessDir`(".opencode"/".cursor" 等)+ `coreDirs`/`harnessFiles` 投影 + `rulesRename`(null か dir 名)+ 任意 `emit` の宣言 1本で表現する。COMPILED_DATA seed は初回ビルド時に committed claude tree の JSON へ fallback(`package.ts:289-299`)するため、新ハーネスの初回ビルドは claude JSON を種にできる。

### 閉じ列挙(手動追記が要る)台帳 — 新ハーネス名を閉じた列挙で持つ9ファイル

open-set の外で「ハーネス集合そのもの」を閉じた列挙として持つファイル。本 intent フォーカス面で編集が要りうるのは計9ファイル(installer 5 + runtime 2 + migrate 1 + self-install 1)。
> 追補(2026-07-16、requirements-analysis reviewer 指摘): installer 契約テストは2本(setup-harness.test.ts / setup-harness-parse.test.ts)で installer 必須は実ファイル5個(harness.ts / engine-layout.ts / reporter.ts / 契約テスト2本 — 旧記載の「5」は harness.ts の2行参照込みの誤計上で、実体は4個だった)、台帳総計は9ファイル。あわせて非破壊の閉じ列挙(`tests/unit/t156-memory-relocation.test.ts:149`、`tests/unit/t199-grilling-distribution.test.ts:33-40` — 新ハーネスを検査しないだけで壊れない)を第3分類として記録する。


**installer(packages/setup)— 5ファイル必須**(未対応だと `install --harness opencode` が弾かれる。正しさに必須):
1. `packages/setup/src/domain/harness.ts:9` `HarnessName` union type(`"claude"|"codex"|"kiro"|"kiro-ide"`)
2. `packages/setup/src/domain/harness.ts:19-24` `HarnessName.all` frozen array
3. `packages/setup/src/domain/engine-layout.ts:8-12` `ENGINE_DIR_BY_HARNESS` map
4. `packages/setup/src/modules/reporter.ts:24-25,137` usage 文字列 + invalid エラー文言
5. `tests/unit/setup-harness.test.ts:13` `toEqual(["claude","codex","kiro","kiro-ide"])`(契約テスト、要更新)
6. `tests/unit/setup-harness-parse.test.ts:17` `HarnessName.parse` の受理集合を直接検査する契約テスト(要更新 — requirements-analysis reviewer 指摘で追補、2026-07-16)

**framework runtime(test-seam/advisory)— 2ファイル**(正しさ非影響):
6. `packages/framework/core/tools/amadeus-lib.ts:114` `KNOWN_HARNESS_DIRS`、`:170-172` `KNOWN_RULES_SUBDIR`(test-seam/fallback 専用、上記 harness.json が実解決の権威)
7. `packages/framework/core/tools/amadeus-utility.ts:857` `otherTrees`(`[".claude",".kiro",".codex"]` フィルタ)、`:2000-2006` `SCAN_EXCLUDE`、`:696` doctor `.claude` 分岐(advisory 品質のみ)

**migration — 1ファイル**(aidlc→amadeus 移行で新ハーネスを扱う場合のみ):
8. `packages/framework/core/tools/amadeus-migrate.ts:71` `INSTALLED_HARNESS_DIRS=[".claude",".codex",".kiro"]`(ほか :383/:843/:1459/:2514)

**self-install — 1ファイル**(dogfood 対象化する場合のみ、面3参照):
9. `scripts/promote-self.ts:37-43` managedDirs、`:169-175` package freshness 対象

### promote:self の現行対応（2026-07-18 鮮度訂正）

`scripts/promote-self.ts` は project-local dogfood install(amadeus が自分自身を開発するため、:2-9 冒頭コメント)であり配布ビルド(dist)ではない。現行 `managedDirs`(:37-43)は Claude(`.claude`)／Codex(`.codex`・`.agents`)／Cursor(`.cursor`)／OpenCode(`.opencode`)を明示管理し、`PACKAGE_HARNESSES`(:166-175)も同4 harness の package freshness を実行する。Kiro／Kiro IDE は self-install 対象外のまま。したがって、この履歴 intent 時点の「Claude／Codex のみ」という記述は現コードに対して失効した。

### doctor の `.claude` 専用ブロックと advisory 劣化

`amadeus-utility.ts:243-245` `handleVersion` は harness 非依存(`amadeus <version>` を出力するのみ)で新ハーネス dist から bun 直叩きで動く。`:676` `handleDoctor(projectDir)` は harness 依存: `:695` `harnessDir()` で分岐し `:696` `if (harness === ".claude")` 専用ブロック(settings.json からフック roster 導出、:714-)を持つ。`.claude` 以外は汎用経路。`:857` `otherTrees` と `:2000-2006` `SCAN_EXCLUDE` は閉じた列挙で、新ハーネスの engine dir がここに無いと「他ツリー存在」advisory 警告に列挙されない。**正しさには非影響で、doctor の advisory 品質のみが劣化**する(厳密対応には otherTrees/SCAN_EXCLUDE 追記が要る)。

### 新ハーネス追加の最小ファイル集合(既存4 harness 対比から導出)

既存4 harness は2系統: **Claude/Kiro 型**(薄 manifest、skills/agents を core .md + harnessFiles で投影)と **Codex 型**(`emit.ts` 368行が宣言行で表せない構造発散 — config.toml/hooks.json/AGENTS.md/11 agent TOML/`.agents/skills/` ツリー全体 — を内包、`skipRunnerGen=true`)。系統は各ハーネスの skills・agents・hooks 探索規約で決まる(Architect 合成で確定すべき設計問い)。

- 配布(dist)成立の最小: `packages/framework/harness/<name>/manifest.ts`(必須)。Claude/Kiro 型なら + `onboarding.fills.ts` + `skills/amadeus/{SKILL.md, question-rendering.md, issue-ref-contract.md}` + rules @-stub(`rules-amadeus.md` 相当)+ 設定 example + `dot-gitignore`(Kiro 型は加えて agent .json 群 + adapter.ts + settings/cli.json、rulesRename あり、onboarding=AGENTS.md projectRoot)。Codex 型なら + `emit.ts` + adapter shim。
- installer 選択可の必須編集: 上記閉じ列挙台帳 1〜4(+契約テスト 5)。
- docs: README(対応表 4→6 + バッジ)+ `docs/guide/harnesses/<name>.md(.ja)` 新規×2言語 + 各 guide のハーネス言及棚卸し。

## canonical settings 観測面（intent 260709-canonical-settings、2026-07-16、履歴）

Amadeus 共通の既定挙動を型付き canonical settings（1正本）へ集約する intent（#623）の観測面。出典は本 intent の `inception/reverse-engineering/scan-notes.md`（Developer scan、observed HEAD `e55cc25143717d84b3e7f1a543151f0b7c99b96f` 直読の file:line）。手法は diff-refresh（base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`＝前 intent 260713-swarm-driver-migration の observed、祖先・距離58で最小、observed=`e55cc25143717d84b3e7f1a543151f0b7c99b96f`）。**区間58コミットに本 intent 関連の新規機構は存在せず、設定土台は base 時点で確立済み**（区間主因は upstream-v2 移行 `amadeus-migrate.ts` +3823行の新規と移行テスト大量追加）。

### フォーカス面1: 設定配置面（ディレクトリ構造・.gitignore）

- `amadeus/spaces/default/` 直下の実ディレクトリは `codekb/`／`intents/`／`knowledge/`／`memory/` の4つのみで、**`settings.json` 相当の設定ファイルは現状存在しない**（`memory/` は `org.md`／`team.md`／`project.md`／`phases/`／`templates/` の手編集ルール層正本）。
- `.gitignore:47-58` の amadeus 関連 ignore パターン: `amadeus/active-space`（:50）／`amadeus/spaces/*/intents/active-intent`（:51）／`amadeus/.amadeus-clone-id`（:52）／`amadeus/.amadeus-sessions/`（:53）／`amadeus/spaces/*/intents/*/runtime-graph.json`（:54）／`amadeus/spaces/*/intents/*/.amadeus-*`（:55）／`amadeus/spaces/*/intents/.amadeus-*`（:58）。**すべて cursor／machine-local runtime／intent 配下の `.amadeus-*` に限定**。
- 含意: `amadeus/spaces/<space>/settings.json`・`memory/` 配下・workspace ルート `amadeus/settings.json` のいずれに設定ファイルを置いても**どのパターンにも一致せず ignore されない**（コミット対象）。version-controlled 化（org.md「amadeus/ ワークスペースはバージョン管理」方針）なら追加の gitignore 変更は不要。

### フォーカス面2: doctor 統合面（`amadeus-utility.ts` handleDoctor）

- health-check row 型: `interface DoctorCheck { pass: boolean; label: string; fix?: string }`（`amadeus-utility.ts:407-411`）。個別チェック関数（`hookHeartbeatDoctorCheck`:527、`checkPhaseProgressConsistency`:653 等）がこの型を返す。
- `handleDoctor(projectDir: string): void`（:676）は内部で `results: Array<{pass,label,fix?}>`（:677）を組み立て、各チェックを inline `results.push({...})` するか `DoctorCheck` 返却関数の結果を push する二方式。**副作用のない純関数化（`export function xxxCheck(projectDir): DoctorCheck`）が in-process テスト可能な既習様式**（spawn-only の handleDoctor 盲点回避、:568/:599 コメント参照）。
- exit code 方針: 集計は `passed`／`failed` カウント（:1926-1937）、末尾 `process.exit(failed > 0 ? 1 : 0)`（:1958）で**どの row が fail でも exit 1**。stdout に全診断を出す（exit code と独立、:1954-1957）。
- 拡張の雛形: `AMADEUS_DEFAULT_SCOPE` 検証 row（:875-892、unset=pass／valid=pass／invalid=fail+fix）。canonical settings の doctor 統合はこの row を拡張する形が自然（面7と直結）。

### フォーカス面3: 既存 parse/validation パターン（厳格 vs 寛容の2 posture）

| posture | 正本 | エントリ／構造 | 未知キーの扱い |
| --- | --- | --- | --- |
| **厳格（Result 型）** | `amadeus-stage-schema.ts` | `validateStageFrontmatter():ValidationResult`（:136）。判別ユニオン `{valid:true;data}｜{valid:false;errors[]}`（:55-57）。`REQUIRED_FIELDS`（:103-116）／`OPTIONAL_FIELDS`（:118）／`KNOWN_FIELDS=new Set([...REQUIRED,...OPTIONAL])`（:120）／`RESERVED_KEYS:Readonly<Record<string,string>>`（:95-101）。型ヘルパ `checkString`／`checkPositiveInteger`／`checkStringArray`／`checkEnum`／`checkSlugPattern`（:455-513） | **errors に集約（throw しない）**: `errors.push(\`unknown key: ${key}\`)`（:163） |
| **寛容（throw）** | `amadeus-rule-schema.ts` | `parseRuleFrontmatter(raw):RuleFrontmatter`（:46）／`validateRuleFrontmatter()`（:63） | **未知キー許容**（:39 コメント forward-compat additive）。不正時のみ `throw new Error(...)`（:69/:72） |

- 設計含意: canonical settings ローダは「ユーザー編集ファイルの未知キーをどう扱うか」で posture を選ぶ。doctor へ流すなら **stage-schema の判別ユニオン `{valid,data}｜{valid,errors[]}` が最も接続容易**（errors をそのまま fail row に写せる）。

### フォーカス面4: 既存 JSON ロード実装（設定ローダが従うべき既習様式）

- intents.json 読み（`amadeus-lib.ts`）: `readIntentRegistry():IntentRegistryEntry[]`（:1496-1509）= `JSON.parse(readFileSync(path,"utf-8")) as unknown`（:1503）→ `Array.isArray` 構造チェック（:1504）→ **try/catch で absent／malformed は `[]` へ寛容フォールバック**（:1505-1507）。書きは `writeFileAtomic(path, JSON.stringify(list,null,2)+"\n")`（:1481/:1832/:1874）。関連 `appendIntentToRegistry`（:1466）／`intentsRegistryPath`（:1462-1464）。
- runtime-graph.json／scope-grid.json 読み（`amadeus-graph.ts`）: path 解決は env-seam 経由 `scopeGridPath()=process.env.AMADEUS_SCOPE_GRID ?? join(DATA_DIR,"scope-grid.json")`（:307、stage-graph も同型 `AMADEUS_STAGE_GRAPH`）。load 後キャッシュ（:326- コメント）。runtime-graph は #849 self-heal 対象（gitignored machine-local 生成物、`amadeus-learnings.ts:151`）で not-found 時は再コンパイル→なお無ければ `fail(...)`（:173/:180）。
- 様式4点: **(a)** `JSON.parse(readFileSync) as unknown` + 構造ガード、**(b)** 欠損は用途で二分（registry=`[]` 寛容／compiled graph=再生成 or fail）、**(c)** 書きは `writeFileAtomic` + 2-space + 末尾改行、**(d)** path は `AMADEUS_*` env-seam で override 可能。canonical settings ローダはこの4点を踏襲すべき。

### フォーカス面5: 共通挙動設定の3系統分散（重複なしの棚卸し結果）

- ハーネス設定ファイルの実態: リポジトリルート実在 harness engine dir は **`.claude` と `.codex` のみ**（`.kiro` はルート不在。ただし `dist/kiro/`・`packages/framework/harness/{claude,codex,kiro,kiro-ide}` は4 harness 実在）。`.claude/settings.json.example`（6745B）は `permissions.allow`／`statusLine`／`hooks`／`companyAnnouncements` を持つが**Amadeus 挙動設定（depth／test-strategy／autonomy 等）は皆無**（model／provider も未 pin）。`.codex/config.toml.example` は `AMADEUS_RULES_DIR` seam・`sandbox_mode`・statusline のみで depth／test-strategy／autonomy キーは `grep -c`=0。
- **棚卸し結論**: Amadeus 共通挙動設定はどのハーネス設定ファイルにも**重複記述されていない**。挙動は3系統に分散:
  1. **CLI フラグ** — `--depth`／`--test-strategy`（`amadeus-orchestrate.ts:396-400`、:448-449 で born intent へ伝播）
  2. **env var** — `AMADEUS_DEFAULT_SCOPE`（settings.json の `env` 由来、面7）
  3. **state ファイルフィールド** — `Construction Autonomy Mode`（`amadeus-orchestrate.ts:722`、`amadeus-bolt.ts:807` が `setFieldStrict` で書く）
- canonical settings intent はこの分散した「1プロジェクトの既定挙動」を型付き1正本へ集約するのが狙いと読める。

### フォーカス面6: dist/self-install 同期経路（`scripts/package.ts` / promote:self）

- **正本の実配置**: `packages/framework/core/`（=`CORE_ROOT`、`package.ts:56-57`）と `packages/framework/harness/<name>/`。root の `core/`・`harness/` は**存在しない**（base 時点で `packages/framework/` へ移設済み、区間内の移動ではない）。
- 新規 tool の dist 搭載条件: `buildTree` が `core/<src>` を `dist/<name>/<harnessDir>/<dst>` へコピー（`package.ts:11-14`、:336 `srcDir=join(CORE_ROOT,src)`）。`.ts`／`.json` はトークン置換なしコピー、`.md` はトークン置換（:76-78）。harness は `manifest.ts` 行から**発見**（:64-71）。→ **新設 `amadeus-<x>.ts` を `packages/framework/core/tools/` に置けば自動で全 dist に載る**（手動 dist 編集は Forbidden）。
- コンパイル済みデータは dist のみ: `COMPILED_DATA=["tools/data/stage-graph.json","tools/data/scope-grid.json"]`（:157）。設定を「コンパイル済みデータ」にするなら同扱い、「手編集正本」なら core/memory 相当 verbatim copy 経路（:227-255 emitMemory/seed）を参照。
- promote:self: `scripts/promote-self.ts` `promoteSelfMain(argv,repoRoot)`（:328）、`--check`／`--apply`／`--no-build`（:145-175）が Claude／Codex／Cursor／OpenCode の project-local self-install を同期。正本（core/harness）を触ったら `bun run promote:self` 必須。検証は `bun run dist:check`（package.ts --check の byte 差分ガード）+ `bun run promote:self:check`。

### フォーカス面7: env var 読み込みと責務境界（`AMADEUS_DEFAULT_SCOPE` precedent）

- `packages/framework/core/tools/*.ts` が読む distinct `AMADEUS_*` env var は約40種で用途4分類: **path-seam（テスト isolation 用が大半）** `AMADEUS_RULES_DIR`／`AMADEUS_STAGE_GRAPH`／`AMADEUS_SCOPE_GRID` 他約16種、**挙動トグル/既定値** `AMADEUS_DEFAULT_SCOPE`／`AMADEUS_SKIP_ARTIFACT_GUARD`／`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`／`AMADEUS_MIGRATION_DOCTOR`、**lock チューニング** `AMADEUS_AUDIT_LOCK_*` 他、**テスト注入専用** `AMADEUS_DOCTOR_TEST_SWAP_*` 他。
- **最重要 precedent = `AMADEUS_DEFAULT_SCOPE`**: 読みは `amadeus-orchestrate.ts:574`（`const envScope=process.env.AMADEUS_DEFAULT_SCOPE`）、resolve 順「引数→env→既定」（:560/:574）。不正時は canonical validator が `Invalid AMADEUS_DEFAULT_SCOPE "...". Valid scopes: ...`（:1532-1534、`amadeus-utility.ts:3925-3931`）。由来コメントが決定的: `amadeus-utility.ts:871`「project-default scope from **settings.json env**」、:872-874「settings.json env が Bash に露出する Claude セッション内でのみ観測可能」。
- 含意: **「settings.json の `env` ブロック → `AMADEUS_*` env var → ツールが読む」チャネルが既に1本存在する**。canonical settings はこの単発チャネルを、型付き設定ファイル（1正本）から複数既定値を供給する形へ一般化する intent と整合。責務境界: depth／test-strategy には env var が無く（CLI フラグ + state のみ）、autonomy も env でなく state field。「env var は現状スコープ既定にしか使われていない」= canonical settings が新設定を持つ余地が明確にある。

### codekb stale 記述チェック結果

- `architecture.md:13,:175,:179-180`・`business-overview.md:37`・`api-documentation.md` 各所は既に `packages/framework/core/`／`packages/framework/harness/<name>/` の3層構造を正しく反映し、本 intent 観測面（設定配置・doctor・parse・JSON・env）に関する **codekb の stale 記述は検出されなかった**（Developer 判定）。よって他 codekb 成果物は温存（churn 回避、cid:reverse-engineering:c1）。
- 参考（codekb 外のルール層注意）: `memory/project.md` の "Way of Working"／Mandated は依然 `core/`／`harness/<name>/` を編集正本と表記するが実配置は `packages/framework/core/`／`packages/framework/harness/<name>/`。この不整合は **base より前**の既存事項で本 intent の range 外・codekb 外（memory ルールの保守事項）。事実記録に留める。

> 以下は過去 intent の構造記録。冒頭の「本 intent」等は各見出しに記された履歴 intent を指し、今回 intent の current marker ではない。

## swarm driver 変更面の配置境界（intent 260713-swarm-driver-migration、2026-07-13、履歴）

| 層 | 正本／生成物 | 現行責務 | 新 driver 契約での含意 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 正本 | autonomy、runtime graph、未完了 batch、walking-skeleton から `invoke-swarm` eligibility を決定 | eligibility は維持。driver selector の自由判断を混ぜず、必要なら機械可読入力だけを渡す |
| `packages/framework/core/tools/amadeus-directive.ts` | 正本 | `{kind, units, repo?}` の schema／parser | requested／selected／topology／capability を directive に載せるかは設計判断。現行は driver-neutral |
| `packages/framework/harness/<name>/skills/amadeus/SKILL.md` | harness 正本 | live conductor の fan-out／retry 手順と現行 driver 選択 | driver 選択が prose に分散する現状。共通 selector の結果を harness adapter が実行する境界候補 |
| `packages/framework/core/tools/amadeus-swarm.ts` | 正本 | `prepare`／`check`／`finalize`、worktree／Bolt、protected file、merge、swarm audit | AI dispatcher にしない。driver-aware audit payload と選択結果の受け口候補 |
| `packages/framework/harness/{claude,codex,kiro,kiro-ide}/onboarding.fills.ts` と Codex `emit.ts` | harness 正本 | harness ごとの導入・設定・生成 | selector、必要な experimental flag、Ultra／trust／capability probe の利用者契約を同期する面 |
| `scripts/package.ts` | build 正本 | core／harness から4 `dist` を生成し drift、whole-tree orphan、source-unreferenced を検査 | 正本変更後の唯一の生成経路。`dist/**` を直接編集しない |
| `dist/<harness>/` | 生成物 | 配布可能な harness tree | `bun scripts/package.ts` でのみ同期 |
| `scripts/promote-self.ts` → `.claude`／`.codex`／`.agents` | self-install 正本＋生成先 | Claude／Codex の project-local self-install | Claude／Codex 正本変更後に `bun run promote:self` と drift check が必要。Kiro は対象外 |
| `tests/unit`／`tests/integration`／`tests/e2e` | 検証正本 | selector、directive、referee、配布、live transport | 決定的 matrix と opt-in live native proof を分離する |

現行 `AMADEUS_SWARM_DRIVER` 実装は0件であり、追加先は既存の層境界を壊さず決める必要がある。最小構造は、core に deterministic selector と型、harness に capability probe／driver adapter、referee に監査用の選択結果を渡す形だが、これは現時点では設計仮説であり Application Design で確定する。

## 計測 seam 台帳 — metrics-observation の観測面(intent 260712-metrics-observation、2026-07-12)

既存計測経路(CCN 分布・テスト数・カバレッジ%)の出力をコミット snapshot に保存する観測機構(#921)が再利用する seam の export 状況・非 export ギャップ・CI 権限前例・配置規約。出典は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260712-metrics-observation.md`(file:line は observed HEAD `c11554226` 直読)。base→observed(`13598b752`→`c11554226`、56コミット)でフォーカス面の export シグネチャは全て不変(実コード触は `tests/lib/coverage-normalize.ts` の #876 closing-only strip のみで export byte 同一)。

### 計測 seam の export 状況(snapshot 入力面)

| 計測軸 | seam | 所在(file:line) | export | snapshot 消費形態 |
| --- | --- | --- | --- | --- |
| CCN 生データ | `runLizard(): MeasurementOutcome` | `tests/complexity-gate.ts:151` | **export** | `records`(path/name/ccn/ordinal)を in-process import して分布導出。spawn 不要 |
| CCN CSV 正規化 | `parseLizardCsv` / `assignOrdinals` | `tests/complexity-gate.ts:128` / `:141` | **export** | lizard 直叩きで自前パースする場合の再利用点 |
| CCN 判定/表示 | `evaluateComplexity` / `baselineMapOf` / `renderBaseline` | `tests/complexity-gate.ts:241` / `:268` / `:223` | **export**(純関数) | baseline 突合・ラチェット表示 |
| CCN 計測対象・閾値 | `MEASUREMENT_ROOTS` / `CCN_BLOCK_THRESHOLD`(15) / `CCN_WARN_FLOOR`(11) | `tests/complexity-gate.ts:43` / `:35` / `:36` | **export const** | 計測面・warn band 分類の定数 |
| カバレッジ機械可読出力 | `writeCoverageTotalsJson()` → `coverage/coverage-totals.json`(`{schemaVersion:1,hits,lines}`) | `tests/run-tests.ts:610` / `:613` | 関数は非 export だが**出力 JSON が機械可読 seam** | %は hits/lines から整数導出。出力先 `coverage/` は **.gitignore 済み**(下記) |
| カバレッジ lcov 正規化 | `normalizeCoverageReport` / `computeStrippableLines` | `tests/lib/coverage-normalize.ts:273` / `:79` | **export**(in-process 可) | lcov から SF/LF/LH 再導出する場合の再利用点。#876 で本体変更も export シグネチャ不変 |

### 非 export ギャップ(唯一の設計判断持ち越し)

- **テスト数の機械可読 seam は不在**(既知ギャップ、functional-design へ持ち越し)。`printSummary()`(`tests/run-tests.ts:899`)が `Test files:`(`:903`)/`Total assertions:`(`:905`)/`Failed files`(`:904`)/`Failed assertions`(`:906`)を **stdout へ print するのみ**で構造化 JSON 出力なし。集計カウンタ `totalFiles`/`failedFiles`/`totalTests`/`totalFailed`(`:398-401`、モジュールスコープ、**非 export**)は per-file `.meta`(`PASS/FAIL`/`TESTS`/`FAILED`、`:434`/`:458`)から積算。snapshot はランナー stdout 行のパースか `.meta` 集計、または seam 化のいずれかを要する。
- カバレッジ内部集計 `collectCoverageTotals(lcov)`(`tests/run-tests.ts:538`、**非 export**)は lcov から `{rows,totalHits,totalLines}` を単一パースで導出し HTML と totals.json の共有源。snapshot がカバレッジ%を lcov から直接取るならこの関数相当を再導出するか `coverage-totals.json` を読む。

### CI 権限前例(commit push を伴う workflow の踏襲元)

| workflow | permissions | commit push 前例 | concurrency |
| --- | --- | --- | --- |
| `ci.yml` | `contents: read`(`:23-24`)、coverage job のみ `id-token: write`(`:81`、Codecov OIDC) | **push 不可**(read 権限) | main は SHA キーでキャンセル無効、PR は ref キーで supersede(`:12-21`) |
| `release.yml` | `contents: write`(`:48`) | release-it が `github-actions[bot]`(`:101`)で bump コミット + tag を **main へ直 push**(`:97-114`)。**GITHUB_TOKEN の push は他 workflow を非トリガー**(`:15-16` コメント、CI ループ回避の設計前例) | `group: release-setup`、`cancel-in-progress: false`(`:43-45`) |

含意: snapshot をコミットへ書く workflow は `contents: write` を要し、release.yml の bot commit + GITHUB_TOKEN 非トリガー前例を踏襲すれば CI ループを起こさない。

### 配置規約(dist 同期 C2 スコープと gitignore)

- dist コピー源は `CORE_ROOT=packages/framework/core`(`scripts/package.ts:57`)+ `HARNESS_ROOT=packages/framework/harness`(`:58`)配下のみ。**`scripts/` と `tests/` は dist へ一切コピーされない** → snapshot ツールをそこに置けば `dist:check`/`promote:self:check`(C2)の**対象外**(dist 再生成義務なし)。逆に `core/` 配置は C2 対象。
- 既存兄弟 CLI 様式: `complexity-gate.ts`/`coverage-project-gate.ts` の `main(args): number` + `import.meta.main`(`complexity-gate.ts:372`/`:384`)。snapshot ツールはこの既習様式に揃える。
- `metrics/` 相当ディレクトリは**不在**(snapshot 出力先は新規ディレクトリの設計判断)。`.gitignore` は `coverage/`(`:30`)を無視 → **snapshot 出力先を `coverage/` 配下にすると commit されない**(要注意)。metrics/snapshot 関連の無視エントリは無し。

## restart-loss フォーカス面の区間構造変化(intent 260711-docs-repair-batch9、2026-07-11)

diff-refresh 区間 `b845478bb..13598b752`(59コミット)のうち、本 intent フォーカス5欠陥の面(#885 slug 境界 / #886 phase-check 境界)に関わる構造変化。出典は本 intent の `inception/reverse-engineering/scan-notes.md`(#885/#886 節の file:line 実測)。#812/#824/#680 の欠陥3ファイル(kiro-ide SKILL.md / onboarding.fills.ts / sensor-type-check.ts)は区間内**無変更**のため構造記録なし(欠陥のみ code-quality-assessment.md に記録)。

| 区間コミット | 構造変化 | フォーカス面への関与 |
| --- | --- | --- |
| `c4304edf4`(#880) | `amadeus-state.ts` の Phase Progress roll-up 配線を advance/finalize/complete-workflow に導入。flip 本体 `setPhaseProgress`(`:101`)/ `markPhaseVerified`(`:114`、setPhaseProgress の薄いラッパ) | #886 の欠陥座標系を再構築した張本人。境界完了4経路(handleAdvance `:1104` / handleFinalize `:1333` / handleCompleteWorkflow `:1428` / handleApprove `:1670`)へ flip を配線したが `verifyPhaseCheckArtifact` precondition は復元せず(phase-check ゲート喪失は未修復) |
| `aac1869e4`(#869) | `amadeus-jump.ts` / `amadeus-orchestrate.ts` に jump の per-phase VERIFIED/SKIPPED を再構築 | jump 経路にも phase-check ゲートを復元せず(grep `phase-check\|PHASE_CHECK\|verifyPhaseCheck` = 0件)。#886 の未復元面 |

**含意**: #886 の phase-check ゲートは restart 前旧系譜(`8cf816138`)で `PHASE_CHECK_REQUIRED_PHASES` + `verifyPhaseCheckArtifact` として存在したが、restart 後の現行 `amadeus-state.ts` には不在。区間内の #880/#869 は境界イベントの flip/roll-up 構造を作り直したものの、旧系譜のゲート precondition を伴わない flip-only 再構築だった(旧系譜 vs 現行の詳細 file:line は architecture.md「docs-repair-batch9 の観測面」節)。#885 の slug 境界一本化(`normalizeWorktreeSlug`)は現行 `amadeus-lib.ts:2099`(worktreePath)/`:2580`(validateBoltSlug)・`amadeus-worktree.ts:195`・`amadeus-state.ts:250` の各 `validateSlug`/`SLUG_RE` が**個別実装のまま**で、旧系譜のチョークポイント一本化構造は現行に存在しない。

## ゲート系ツールの構造テンプレート(intent 260710-complexity-gate、2026-07-10)

複雑度ゲート(feature スコープ)が踏襲する構造テンプレートは `tests/coverage-project-gate.ts`(#762、236行)で確立済み。段構成:

| 段 | 行 | 役割 |
| --- | --- | --- |
| env seam(呼び出し時解決) | :38-54 | `totalsPath()`/`baselinePath()` が `AMADEUS_COVERAGE_TOTALS`/`AMADEUS_COVERAGE_PROJECT_BASELINE` を呼び出し時に解決(in-process seam) |
| 型定義(判別ユニオン) | :59-77 | `Totals`/`FailReason`(5値)/`GateResult`(pass/fail 判別)/`LoadedTotals`(読み込みとパース分離) |
| parse-don't-validate | :83-113 | `parseTotalsText` が `ParseOutcome` を返す。schemaVersion===1・非負整数・hits<=lines を検査 |
| BigInt 厳密判定 | :119-126 | `passesThreshold` が除算を排した整数比較。`pct()` は表示専用(:128-130) |
| fail-closed 分類 | :132-170 | `evaluateGate` が MISSING_CURRENT→MALFORMED→MISSING_BASELINE→EMPTY_POPULATION→DROP_EXCEEDED の順で fail |
| CLI(`--check`/`--update`) | :175-236 | `load`/`runCheck`(fail で stderr+exit1)/`runUpdate`(baseline 再書き)/`main`(他フラグは USAGE+exit2)。`import.meta.main` で `process.exit(main(...))` |

committed baseline は `tests/.coverage-project-baseline.json`。エクスポート(`evaluateGate`/`main`/`runCheck`/`runUpdate`/型)により in-process seam でテスト可能。複雑度ゲートの lizard CCN baseline ラチェットはこの段構成を直接踏襲する(baseline JSON は現存 CCN>15 の42関数を grandfather)。CI ジョブ DAG(`check`/`coverage`/`codecov-status`/`ci-success`)と lizard ステップ配置は本ページ下部「Coverage CI 経路」節および architecture.md「ゲート系ツールの正準テンプレートと CI ジョブ構成」節を参照。

## packaging 構造(intent 260710、#735 の中核)

> 前回 intent の2バグは出荷済み(#685→#729、#670→#727)。下記は source-unreferenced-check intent(履歴)の重点構造。

### `scripts/package.ts` の段構成

`buildTree(m, outRoot, seedFrom)`(L307-460)が build の入力読み取りと dist 生成を一手に担う。段構成:

1. **core dirs 投影**(L322-344): `m.coreDirs` の各 `src` を `walk()` で全列挙し token 置換 + rules-rename してコピー。`frontmatterAdditions` の未ヒット検出付き(L345-351、typo ガード)。
2. **harness authored files コピー**(L357-363): `m.harnessFiles` の**列挙された `src` のみ**コピー。`projectRoot:true` は `dist/<name>/` 直下、それ以外は `<harnessDir>/` 内。
3. **onboarding**(L370-376)/ **memory tree emit**(L382-395)/ **compile**(L405-416)/ **harness.json/VERSION emit**(L425-431)/ **runner-gen**(L438-441)/ **emit プラグイン**(L446-458)。

`checkHarness(name)`(L554-634)は tmp に build して committed dist と byte-diff:

| pass | 行 | 検出 |
| --- | --- | --- |
| built → committed | L565-573 | `MISSING`/`DIFFERS` |
| committed → built(harness-dir) | L574-582 | `ORPHAN`(`authoredExempt` で除外可) |
| projectRoot harnessFiles | L586-592 | 外部 `MISSING`/`DIFFERS` |
| emit-owned(harness-dir 外) | L595-604 | `MISSING`/`DIFFERS` |
| dist 全域 orphan scan(#711) | L605-628 | 期待集合外の committed ファイルを `ORPHAN` |

CLI(L639-682): `--check` で `checkHarness`、それ以外で `writeHarness`。ターゲットは `discoverHarnessNames()`(L68-73、`harness/*/manifest.ts` の存在で発見)または明示名。`present` フィルタ(L668)は manifest を持つ harness のみビルド。

### harness manifest スキーマと全 harness 目録

契約は `scripts/manifest-types.ts` の `HarnessManifest`(L70-113): `coreDirs`/`harnessFiles`/`frontmatterAdditions?`/`onboarding?`/`rulesRename`/`authoredExempt`(L101、RegExp[])/`skipRunnerGen?`/`emit`。`authoredExempt` は「生成/コピー dir 内に置かれる authored ファイルを orphan scan から除外」する regex 群。

| harness | harnessDir | rulesRename | authoredExempt | emit / skipRunnerGen |
| --- | --- | --- | --- | --- |
| claude | `.claude` | `null` | `[]`(空) | emit `null` |
| codex | `.codex` | `amadeus-rules` | `[/^hooks\/amadeus-codex-[^/]+\.ts$/]` | emit あり / `skipRunnerGen:true` |
| kiro | `.kiro` | `steering` | `[/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/]` | emit `null` |
| kiro-ide | `.kiro` | `steering` | `[/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/, /^hooks\/[^/]+\.kiro\.hook$/]` | emit `null` |

`authoredExempt` は harness-dir subtree orphan pass(L579)でのみ消費される。**kiro と kiro-ide の差は `.kiro.hook` exemption の有無**: kiro-ide は `.kiro.hook` を `harnessFiles` で正規に出荷する(9個、L51-59)ため exemption が必要。kiro CLI は `.kiro.hook` を出荷しない(hooks は `agents/amadeus.json` から読む)ため、#737(`6f1d7ab2a`)で7個の stale ソースを削除し vacuous exemption `/^hooks\/[^/]+\.kiro\.hook$/` を除去した。

### 全 harness の authored ソース実態(manifest 参照状況)

`packages/framework/harness/<name>/` の実ファイルと manifest 参照の対応(#735 の「正当な未参照候補」= build 機構ファイル):

| harness | authored ソース | manifest 参照(出荷される) | build 機構(出荷されない、正当に未参照) |
| --- | --- | --- | --- |
| claude | 8ファイル | `SKILL.md`/`question-rendering.md`/`rules-amadeus.md`/`settings.json.example`/`settings.local.json.example`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |
| codex | 7ファイル | `hooks/amadeus-codex-adapter.ts`/`dot-gitignore` + `SKILL.md`/`question-rendering.md`(emit 経由) | `manifest.ts`/`onboarding.fills.ts`/`emit.ts` |
| kiro | 13ファイル | `agents/*.json`(6)/`hooks/amadeus-kiro-adapter.ts`/`settings/cli.json`/`SKILL.md`/`question-rendering.md`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |
| kiro-ide | 22ファイル | `agents/*.json`(6)/`hooks/amadeus-kiro-adapter.ts`/`hooks/*.kiro.hook`(9)/`settings/cli.json`/`SKILL.md`/`question-rendering.md`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |

正当な未参照(build 機構: `manifest.ts`/`onboarding.fills.ts`/codex の `emit.ts`)は `package.ts` から `require()` で読まれるモジュールであり、dist へコピーされない設計。#735 の source-unreferenced check はこれらを誤検出しない除外設計を要する。現時点で全 harness に **manifest 参照も build 機構でもない未参照ソースは残っていない**(#737 で kiro の7個を除去済み。実測: `harness/kiro/hooks/` は `amadeus-kiro-adapter.ts` のみ)。

## 260709-gate-mechanics(前 intent、履歴)関連構造

## 差分リフレッシュ(260709-packaging-repair-batch)

packaging-repair-batch(intent 260709-packaging-repair-batch、履歴)の2バグの正本ファイルと、差分区間 `a1c79dc12..22e3eb5aa` の構造的差分。

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `scripts/package.ts` | `dist/<name>/` の生成・検査(`buildTree`/`writeHarness`/`checkHarness`) | **#701 の対象**。`checkHarness`(L554-624)の orphan スキャンルート集合 `[".agents","amadeus"]`(L611)が dist ルート平坦面を含まない。clean-sweep(`writeHarness` L521-549)も harness dir と `dist/<name>/amadeus/` の2つのみを掃く |
| `scripts/release-version-sync.ts` | version 面3点(version.ts / README バッジ / setup package.json)の同期 | **#702 の対象**。`patchFile`(L34-45)、version.ts patch(L47-51)→ badge patch(L53-54)の適用順、version 受理正規表現(L22) |

**tests/ 層の目録更新(hermeticity 再編 + 新規)**:

- 新規(A): `tests/lib/test-size.ts`(テストサイズ計測の共有ヘルパー、`tests/lib/` 配下)、`tests/unit/t-test-size-drift.test.ts`(サイズドリフトガード)、`tests/unit/setup-http.test.ts`、`tests/unit/t112-delegated-approval.test.ts`、`tests/unit/t202-hook-project-dir-worktree-marker.test.ts`、`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts`。
- 再編(M): PR #703 により `tests/unit/`・`tests/integration/`・`tests/e2e/` の多数ファイルで hermeticity(共有状態・実行順序依存の排除)修正。`tests/run-tests.ts`・`tests/lib/setup-*-fixture.ts`・coverage レジストリ(`.coverage-ratchet.json`/`.coverage-registry.json`)も追随更新。
- テスト層構成(smoke / unit / integration / e2e の4層 + `tests/lib/` 共有)自体は不変。
- 新規(A、`9a2f5c72..24197d755` = `260709-dynamic-test-size` スキャンで確認、#721/#722 由来): `tests/helpers/arbitraries/semver.ts`(PBT 用 arbitrary ヘルパー、**新規ディレクトリ `tests/helpers/arbitraries/`**)、`tests/unit/setup-semver.pbt.test.ts`(fast-check ベース PBT 単体テスト、ヘッダ `// covers: domain:setup-semver` / `// size: small`)。テストランナー・size 分類ロジックには非関与(#699 フォーカス面への影響なし)。`tests/integration/t92.test.ts` は #709 対応で test 44 に skip ガードを追加(M)。

## トップレベル構造

`packages/` は `framework` と `setup` の2パッケージ構成のまま。トップレベル構造自体に変更はない。

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-swarm.ts` | swarm 収束・merge-back オーケストレーション | **#674 の対象**(`handleFinalize`) |
| `packages/framework/core/tools/amadeus-state.ts` | ステージ状態遷移(approve/reject/revise/advance) | **#675 の対象**(`handleApprove`/`handleReject`) |
| `packages/framework/core/tools/amadeus-bolt.ts` | Bolt ライフサイクル(start/complete/release-merge) | **#676 の対象**(`start --worktree`) |
| `packages/framework/core/tools/amadeus-lib.ts` | 共有ライブラリ(audit path、record dir、codekb repo 名解決) | **#676・#668 の対象**(`auditFilePath`、`codekbRepoName`) |
| `packages/framework/core/tools/amadeus-utility.ts` | `/amadeus` ユーティリティハンドラ群(`codekb-path` 等) | **#668 の対象**(`codekb-path` ハンドラ) |
| `packages/setup/src/ports/http.ts` | GitHub API/アーカイブ取得の HTTP ポート | **#677 の対象**(`getJson`) |
| `packages/setup/src/internal/tar-archive-extractor.ts` | tar.gz ストリーミング展開 | **#678 の対象**(`extractTarGz`) |

## `amadeus-swarm.ts` の finalize 内部構成(#674 の対象)

`handleFinalize()`(`amadeus-swarm.ts:484-631`)は3段構成。

1. **再検証フェーズ**(L531-582): claimed unit を `verdictFor()` で再検証し、`results[]` に最終ステータス(`converged`/`failed`)を確定する。ここで `genuine[]`(merge 対象の unit 名リスト)も確定する。
2. **merge-back フェーズ**(L588-599): `genuine` を昇順ソートし、unit ごとに `amadeus-bolt.ts release-merge` → `complete --merge` を直列実行する。失敗は `mergeFailures[]` に積むのみで、`results[]` は再訪しない。
3. **audit emission フェーズ**(L603-614): `results[]` を単純に走査し、`status === "converged"` なら `emitUnitConverged`、それ以外は `emitUnitFailed` + `emitBoltFailed` を出す。merge-back フェーズの結果はこの走査に反映されない。

`envelope`(L620-626)の `merge_failures` フィールドと `exit code 2`(L630)だけが merge 失敗を外部に伝える経路であり、audit trail(`emitUnitConverged`/`emitUnitFailed`)と `results[]` そのものは merge 失敗を知らない。

## `amadeus-state.ts` の gate ハンドラ構成(#675 の対象)

| ハンドラ | 行 | human-presence guard |
| --- | --- | --- |
| `handleApprove` | L1286-1379 | あり(L1321-1337: `isAutonomousMode` → `humanPresenceGuardDisabled` → `humanActedSinceGate`) |
| `handleReject` | L1430-1487 | **なし** |
| `handleRevise` | L1490- | (未確認、本スキャン対象外) |

`handleApprove` と `handleReject` はどちらも `withAuditLock(pd, () => { ... })` で state file の read-modify-write を保護し、`validateSlugInState` で遷移前状態を検証する構造は共通している。ガードの有無だけが非対称。

## `amadeus-bolt.ts` start と `amadeus-lib.ts` の audit path 解決(#676 の対象)

`start`(`amadeus-bolt.ts:196-220`)の `--worktree` パスは次の順で処理する。

1. state ファイルの shape 検証(L199-205、`readStateFile` が例外を投げたら `failJson`)
2. `emitAudit(pd, "BOLT_STARTED", fields, flags.intent, flags.space)`(L220)

`emitAudit` は内部で `auditFilePath(projectDir, intent, space)`(`amadeus-lib.ts:1267-1270`)を呼び、これが `recordDir(projectDir, intent, space)` の解決結果に応じて書き込み先を決める。`recordDir` が `null` を返すケース(L1269 の分岐)では `spaceRecordRoot(projectDir, space)/audit/<shard>` という bare な場所に書き込まれる。この関数自体は `stateFilePath`(L1255-1259)と同じ fallback パターンを共有しており、両者とも「intent が解決できないとき、intent 固有 record dir の外側に書く」という設計になっている。

## `packages/setup/src/ports/http.ts` の Result 境界(#677 の対象)

`Http` 型(L9-12)は `getJson`/`downloadArchive` の両方を `Promise<Result<..., FetchError>>` として宣言している。`fetchChecked()`(L46-59)は自身の try/catch でネットワークエラー・非 2xx ステータスを `FetchError` に正しく分類する。しかし `getJson()`(L23-28)自身は関数全体を try/catch していない。`downloadArchive()`(L30-38)も同様に `fetchChecked` の外で `response.body` の null チェックのみを行っており、`.json()` のような例外を投げる可能性のある処理は含まれないため `downloadArchive` 側にはこの欠陥はない。欠陥は `getJson` の `.json()` 呼び出し(L27)一箇所に限定される。

## `tar-archive-extractor.ts` の状態機械構成(#678 の対象)

`extractTarGz()`(L33-148)は次の変数をクロージャで共有する状態機械。

| 変数 | 役割 | スコープ |
| --- | --- | --- |
| `carry` | 直前チャンクからの持ち越しバイト列 | `for await` ループの外側で宣言(L36)、chunk ごとに `Buffer.concat` で拡張(L43) |
| `pendingLongName` | PAX(`x`)/GNU(`L`)ヘッダから読んだ次エントリの長いファイル名 | 同上(L37)、`drain()` 内で set/consume |
| `current` | 書き込み中のファイルエントリ(`path`/`remaining`/`chunks`) | 同上(L38) |

`drain(final)`(L54-148)は `carry.length < BLOCK_SIZE` などデータ不足時に `null` を返して次チャンク待ちに戻る設計(L64-65, L82-85, L98-100, L109-112)であり、これ自体は chunk 境界を跨ぐ設計として妥当に見える。#678 として持ち越すべき論点は、この状態機械が実際の `git archive`/codeload 出力(長いパス名を持つファイルが PAX/GNU ヘッダと本体ヘッダの間でチャンク分割される具体的な入力)に対して実測でも正しく動くかどうかであり、静的スキャンだけでは確定できない。

## 差分リフレッシュで反映した構造(integrity-batch、`a1c79dc12..162553b99`)

前回スキャン以降の構造変化と、当該 intent(260709-integrity-batch)の4バグ(#705/#706/#707/#708)の焦点ファイルを追記する。

### codekb ストア構造(#707 の対象)

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `.claude/tools/amadeus-lib.ts` `codekbRepoName`(L556-565)/ `codekbDir`(L530-533)/ `originRepoSlug`(L571-580) | codekb ディレクトリ名を origin remote 由来で解決(#693 で統一) | #707 の前提。`codekb/claude-leader/`・`codekb/claude-engineer-1/` は削除され `codekb/amadeus/` 単一化 |
| `.claude/amadeus-common/stages/inception/reverse-engineering.md`(L5 condition / L36 outputs / L110 timestamp) | RE ステージ定義。常時リフレッシュ・9固定ファイル・**単一** timestamp marker | **#707 の直接対象**(単一 timestamp で並行 base/observed を表現できない) |

### テストハーネス構造(#705 の対象)

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `tests/run-tests.ts`(L31 `Level`、L577-587 `levelFiles`、L485-489 `shouldSkipForClaude`) | tier discovery(smoke/unit/integration/e2e 各ディレクトリ直下のみ)と substrate skip | #705 の構造的根拠(`tests/harness/` はどの Level にも属さず discovery/skip の外) |
| `tests/harness/sdk-drive.calibration.test.ts`(L55-72) | doctor 既知回答文字列のピン留め | **#705 の直接対象**(L72 `DOCTOR_DOCS_LABEL` が現行 doctor 出力とドリフト、かつランナー管理外) |
| `.claude/tools/amadeus-utility.ts`(L628 doctor workspace チェック) | doctor が出力する現行ワークスペース文言(`workspace shell ready ...`) | #705 の期待値ドリフトの対向(旧 `amadeus-docs/ directory exists` は不在) |

### knowledge 配布構造(#706 の対象)

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`(L3) | delivery-agent の実行計画ガイド | **#706 の直接対象**(不在の `product-guide.md` を tree 外参照。core→dist→self-install の全複製に伝播済み) |
| `packages/framework/core/agents/amadeus-delivery-agent.md`(L71-77) | delivery-agent の knowledge ロードパス宣言 | #706 の根拠(自分の dir と `amadeus-shared/` のみ読み、product-agent dir は読まない) |
| `packages/framework/core/hooks/amadeus-mint-presence.ts`(L12-13, L23-31) | UserPromptSubmit で `HUMAN_TURN` を無条件 mint(stdin 未読) | **#708 の直接対象**(mint 側)。参照様式は `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` |

## 次工程へ持ち越す設計候補

1. #674: merge-back 失敗を検知した時点で `results[]` の該当 unit を `"failed"` に書き換え、`emitUnitFailed`/`emitBoltFailed` を出すよう finalize のフェーズ順序を見直す。
2. #675: `handleReject` に `handleApprove` と同じ human-presence guard(または reject に適した緩和版)を追加する。reject を human-presence の対象外にする意図的な設計なのか欠陥なのかを requirements-analysis で確定する。
3. #676: `--worktree` の `start` が audit を発行する前に、intent/space が `recordDir` で解決可能であることを検証し、解決不能なら明示的に失敗させる(bare fallback に静かに落とさない)分岐を追加する。
4. #677: `getJson()` の `.json()` 呼び出しを try/catch で包み、パース失敗を `FetchError` に分類して `Result.err` を返すようにする。
5. #678: 実際に PAX/GNU ヘッダがチャンク境界を跨ぐ tar.gz を用意した回帰テストを作成し、現状の実装が正しいことを実証するか、実際に破綻する入力を特定する。
6. #668: `codekbRepoName()` の fallback を `basename(projectDir)` から、worktree を認識した実リポジトリ名の解決(例: `git rev-parse --show-toplevel` の親、または `.git` の `commondir` を辿る)に変更する。

## Coverage CI 経路(260710-codecov-project-gate の対象)

> 出典: `.github/workflows/ci.yml`・`codecov.yml`・`tests/run-tests.ts`・`tests/gen-coverage-registry.ts`・`tests/.coverage-ratchet.json`(2026-07-10, HEAD 98089faf 実測)。codecov-project-gate intent(履歴)はこの経路へ「Codecov 非依存の自前 project ゲート」を追加した。

### CI ジョブ DAG(`.github/workflows/ci.yml`)

| ジョブ | 行 | 役割 | カバレッジ関与 |
| --- | --- | --- | --- |
| `check` | :20-58 | typecheck・lint・dist:check・promote:self:check・`test:ci` | なし |
| `coverage` | :60-103 | `needs: [check]`。`bun run coverage:ci`(:82)で lcov 生成、`coverage/lcov.info` と `coverage/html` を artifact 化(:84-93)し Codecov へ OIDC 送信(:95-103、`fail_ci_if_error: true`) | **codecov-project-gate の入力元** |
| `codecov-status` | :105-200 | `needs: [coverage]`, `if: always()`。`github-script`(:117)で外部 status を polling: `requiredChecks` 組立(:132-138、#717 が触る箇所)、`waitForCheck()` 最大60回×10秒(:144-178)、check-run/combined-status 両経路探索(:180-200) | Codecov status 待ち。**自前ゲートは polling 不要** |
| `ci-success` | :202-225 | `needs: [check, coverage, codecov-status]`, `if: always()`。`require_result()`(:213-220)が各 `needs.<job>.result` を `success` と厳格比較、集約対象は3ジョブ(:222-224) | 集約ゲート |

### 総カバレッジ% 算出箇所(`tests/run-tests.ts`)

- per-file LCOV 生成: `bun test --coverage --coverage-reporter=lcov` を個別実行し `coverage/.parts/<safe-name>/` へ出力(:753-776)。
- 結合 → 正規化 → 書き出し: `combineCoverageReports()`(:641-660)→ `normalizeCoverageReport()`(:503-563)→ `coverage/lcov.info`。正規化は harness 生成パス(`.claude/`・`.codex/`・`dist/*/.{claude,codex,kiro}/`)を `packages/framework/core/` へ再マップ(:488-501)。
- 正規化後レコード: `SF` / `FNF` / `FNH` / `DA:<line>,<count>` / `LF`(=DA 行数, :557)/ `LH`(=count>0 の DA 行数, :558)/ `end_of_record`(:546-561)。
- **総% は既に算出済み**: `writeCoverageHtml()`(:597-599, :627)が `totalHits/totalLines` から `Total line coverage: {pct}% ({totalHits}/{totalLines})` を HTML へ出力。ただし機械可読(stdout/JSON)な emit 経路は現状なし(:627 が唯一)。

### ラチェット機構(`tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json`)

- ベースライン: `tests/.coverage-ratchet.json`(クラス別 covered ユニット**件数**、%ではない)。path は `AMADEUS_COVERAGE_RATCHET` env で上書き可(:104-105)。
- 単調 fail-closed 判定: `runCheck()`(:1242-1266)が各クラスで `now < base` を検知して `ok=false`(増やせるが黙って減らせない)。
- 更新: `writeAll()`(:1275-1278)が `--check` なし実行で registry+ratchet を再生成。人間がレビュー付きコミットで更新(:1259-1262 が手順案内)。
- `--check` 実行契約: drift・空クラス・cross-check・ratchet を検査し失敗時 `process.exit(1)`(:1283-1290)。CI 直接ステップは無く、`tests/unit/gen-coverage-registry.test.ts` が `spawnSync`(:152, :267, :279)で **temp tree** に対し落ちる実証を行う。
- **自前 project ゲートのベースライン運用テンプレート**: リポ内コミット済みファイル + 単調 fail-closed + env 差し替えでの落ちる実証、という同型が既に確立。

### 自前 project ゲートの出荷後状態(intent 260710-bughunt-fix-batch スキャン、HEAD `b845478bb` 実測)

> 上記「Coverage CI 経路」節が予告した「Codecov 非依存の自前 project ゲート」は base `fc5a34cf1`→observed `b845478bb` の区間で **出荷済み**(PR #762 = #734、`9738580ef`)。本 bugfix intent のフォーカス面(#771/#773/#775/#776/#779)には直接関与しないが、CI アーキテクチャの構造変化として記録する。

- 新規(A): `tests/coverage-project-gate.ts`(236行、lcov 総計を main ベースライン比で fail-closed 判定するゲート本体)、`tests/lib/coverage-source-path.ts`(66行、カバレッジ source パス正規化ヘルパー)、`tests/.coverage-project-baseline.json`(5行、main ベースライン%)、`tests/unit/coverage-project-gate.test.ts`(ゲートの落ちる実証)。
- 関連(M): `.github/workflows/ci.yml`(#762 でゲート配線 + #778=#777 で main push を `cancel-in-progress` 対象外化し Coverage Report 打ち切り/Codecov base 欠落を解消)、`codecov.yml`。
- 位置づけ: ラチェット機構(件数ベース)と相補で、こちらは **lcov 総計%の main ベースライン比**を fail-closed で見る。両者とも「リポ内コミット済みベースライン + 単調 fail-closed + env 差し替えでの落ちる実証」テンプレートに従う。
