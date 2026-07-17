# reverse-engineering スキャンノート — 260716-answer-preemption-guard(Issue #922)

> Developer 差分スキャン担当。base=`f0f4e0ca4e60fbe36a867015e134346aff0094c4`(前 re-scan 260716-eoc1-gate-check の observed、祖先性 exit 0・距離 124 実測)。observed=HEAD=`e530fc4b13f477e9155d1ec246fd50a49176eadd`。行番号・数値はすべてコマンド出力/実読から転記。

## 区間 diff 実測

`git diff --stat f0f4e0ca4e6..HEAD -- packages/framework/core/ tests/`(record/memory 除外)から、本 intent のフォーカス面に関わる主要変更:

- `packages/framework/core/tools/amadeus-lib.ts` … +95 行(checkQuestionsEvidence 群 = 直前 intent 260716-eoc1-gate-check で導入済み)
- `packages/framework/core/tools/amadeus-state.ts` … +64 行(handleGateStart 内 E-OC1 evidence ガード配線 = 同上)
- `packages/framework/core/tools/amadeus-norm-metrics.ts` … +550 行(新規、本 intent とは無関係の norm-metrics Bolt)
- `packages/framework/core/tools/amadeus-utility.ts` … 46 行(本 intent 無関係)
- `tests/integration/t-eoc1-gate-evidence.test.ts` … +213 行(新規、checkQuestionsEvidence + gate-start 配線テスト)
- sensor 機構(amadeus-sensor.ts / amadeus-sensor-*.ts / amadeus-graph.ts / .claude/hooks/amadeus-sensor-fire.ts / sensors/*.md)は**この区間では未変更**(既存実装がそのまま本 intent の変更対象)

要点: checkQuestionsEvidence と gate-start ガードは base〜HEAD 区間で既に着地済み(#1101/#1106)。本 intent(#922)は「その予測ロジックを sensor 発火点へも配線し、[Answer] 先取りを Write/Edit 時点で機械検知する」拡張であり、sensor 機構は無改変のまま利用対象となる。

## フォーカス面 (a)〜(g) 各 file:line

### (a) checkQuestionsEvidence — `amadeus-lib.ts`

- 型: `packages/framework/core/tools/amadeus-lib.ts:1144-1146`
  ```
  export type QuestionsEvidence =
    | { kind: "pass"; reason: "no-file" | "no-answer-tag" | "answer-blank" | "evidence-present" }
    | { kind: "fail"; reason: "no-evidence" | "unparseable-timestamp" };
  ```
- 関数: `amadeus-lib.ts:1173` `export function checkQuestionsEvidence(questionsPath: string): QuestionsEvidence`(**export 済み**、引数はファイルパス1本、戻り値は判別ユニオン)
- ヘルパー(module-scope、非 export): `isFilledAnswer`(:1154)、`hasParseableApprovalTimestamp`(:1163)。正規表現定数 `ANSWER_TAG_RE`(:1148)/`ECODE_RE`(:1149)/`ISO_TS_RE`(:1150)。
- 判定ロジック(:1174-1194): no-file → no-answer-tag → answer-blank(未記入/N/A/単一括弧プレースホルダ)→ evidence-present(E-code あり or 承認行に parseable ISO TS)→ 承認行はあるが TS 不正なら fail:unparseable-timestamp → それ以外は fail:no-evidence。
- 設計コメント(:1140-1143): read-only。呼び出し側が失敗の扱いを決める(gate-start は fail 理由を fail-closed error() へマップ)。**先取り検知本体は既に純関数として抽出済み** — sensor から再利用可能。

### (b) handleGateStart 内ガード配線 + cutoff 定数 — `amadeus-state.ts`

- import: `amadeus-state.ts:40` で `checkQuestionsEvidence` を lib から取り込み。
- 呼出: `handleGateStart`(:1690)。E-OC1 evidence ゲート本体は :1710-1733。
- **cutoff 定数**: `amadeus-state.ts:1721` `const GUARD_CUTOFF_YYMMDD = 260716;`(ローカル定数、handleGateStart 内スコープ。export/module-scope ではない)
- 日付導出: `:1722` `intentDate = Number.parseInt(basename(rd).slice(0,6), 10)`(record dir 名の先頭 YYMMDD)。`:1723` `enforced = intentDate >= GUARD_CUTOFF_YYMMDD`。
- ガード適用(:1724-1733): `questionsPath = join(rd, stage.phase, slug, `${slug}-questions.md`)`(:1725)→ `checkQuestionsEvidence`(:1726)→ fail:no-evidence(:1727-1729)/ fail:unparseable-timestamp(:1730-1732)で `error()`(fail-closed、checkbox 遷移前)。cutoff の趣旨(:1715-1720):live corpus の 59/111 questions は E-OC1 規約以前 → 遡及適用回避。

### (c) sensor 機構

**dispatcher `amadeus-sensor.ts`**:
- サブコマンド: list / describe / fire(:1-8 ヘッダ、:878 `main(argv)`、:891-906 switch)。CLI エントリは `import.meta.main` ガード(:912-914)、seam は export(`handleFire` :315、`stripProjectDir` :130、`decideOutcomeOrScriptError` :666 等)。
- fire 引数: `--stage <slug>`(必須、:321)、`--output-path <path>`(必須、:322-323)。`--project-dir` は `stripProjectDir` で事前剥離(:130/:879)。
- finding 書出し先: `detailDir = join(sensorsDir(projectDir), stageSlug)`(:440)、`detailPath = <detailDir>/<id>-<fireId>.md`(:441)。FAILED 時のみ wx-flag + rename でアトミック書込(:487-503)。
- audit emit: SENSOR_FIRED(:464-475、lock 窓 A)→ spawn per-sensor script(:479-485)→ 真理値表 `decideOutcome`(:520)で PASSED/FAILED/BUDGET_OVERRIDE 判定 → 終端行 emit(:506-508、lock 窓 B)→ `process.exit(0)`(:511、sensor 失敗 ≠ CLI 失敗)。
- per-sensor script 解決: manifest `command:` の .ts basename を自ファイル隣接で解決(`resolveScriptPath` :162-176、seam `AMADEUS_SENSOR_SCRIPT_DIR`)。spawn は `bun <script> --stage <slug> --output-path <path>`(:480、cwd=projectDir)。code sensor(linter/type-check)は `--file-path`、それ以外は `--output-path`(:394-400)。required-sections は追加で `--templates-dir`/`--template-eligible`/`--framework-templates-dir` を threaded(:428-439)。

**per-sensor script `amadeus-sensor-required-sections.ts`**(既存実装1本の構造):
- import(:1-3): `node:fs`、`node:path`、**`./amadeus-lib.ts` から `errorMessage, parseBoltDag`**(→ 新 sensor が checkQuestionsEvidence を lib から import する前例が成立)。
- stdout JSON 契約: `Result`(:5-33)= `{ pass: boolean; h2_count; headings; findings_count; edge_block?; template?; ... }`。dispatcher は `out.pass`(boolean 必須、:576)と `out.findings_count`(`readFindingsCount` :693-699)を汎用的に読む。
- CLI エントリ: `import.meta.main` ガード(:229-232)、`main` seam。
- **manifest との対応**: script は `--stage`/`--output-path`(+ dispatcher threaded flags)を受け、pass/findings_count を stdout JSON で返すだけ。sensor id ごとの分岐は dispatcher が持たない(id-agnostic)。→ 新 sensor 追加は「manifest 1枚 + script 1本 + stage の sensors: リストへ id 追加」で完結する構造。

### (d) sensor manifest frontmatter スキーマ — `sensors/amadeus-required-sections.md`

frontmatter(:1-24)実測フィールド:
```
id: required-sections
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-required-sections.ts
default_severity: advisory
description: ...
category: document-shape
matches: "**/{amadeus-docs,intents}/**"
input_schema: { output_path: string, stage_slug: string }
output_schema: { pass: boolean, h2_count: integer, headings: string[], findings_count: integer, ... }
timeout_seconds: 5
```
- `command` は `{{HARNESS_DIR}}` プレースホルダ(パッケージャが解決)。
- `matches` が capability filter(compile 時に SensorResolution へ verbatim スナップショット)。**`**/{amadeus-docs,intents}/**` は questions ファイルにマッチする**(下記 A1 で実測)。
- `default_severity: advisory`。timeout は `timeout_seconds`(未指定時 dispatcher デフォルト 60s、amadeus-sensor.ts:61)。

### (e) stage `sensors:` → `sensors_applicable` 解決経路 — `amadeus-graph.ts`

- 型: `SensorResolution`(:110-113 付近、`{ id; path; matches? }`)。GraphStage に `sensors?: string[]`(:133)と `sensors_applicable: SensorResolution[]`(:154、REQUIRED、stage.sensors 未宣言時は `[]`)。
- resolver: `resolveSensorsForStage`(:704-728) — stage.sensors の各 id を `loadSensors()` の Map で引き(:709-717、未知 id は compile 時に throw = fail-loud)、`sensor.manifest.matches` を verbatim コピー(:719-722)、宣言順を保持。
- `loadSensors`(:656)は `.claude/sensors/`(seam `AMADEUS_SENSORS_DIR`、:299)を id で index、重複 id は throw。
- 呼出元: `compileStageGraph` 内(:1545 `loadSensors()`)。→ **新 sensor は (i) manifest を sensors/ へ追加 (ii) 対象 stage の frontmatter `sensors:` に id 追加 → compile で sensors_applicable へ載る**。requirements-analysis の宣言例: `requirements-analysis.md:33-35` `sensors:\n  - required-sections\n  - upstream-coverage`。

### (f) PostToolUse hook 発火経路 — `.claude/hooks/amadeus-sensor-fire.ts`【A1 の核心】

matcher = Write|Edit(:1-5)。処理列:
- projectDir 解決(:40)、TTY ガード(:56)、stdin JSON parse(:62-70)。
- **filePath 抽出**: `parsed?.tool_input?.file_path`(:76、絶対パス)。空なら exit 0(:77)。
- 再帰ガード(:87-96、sensors detail dir への書込みを除外)。
- pre-init / state ガード(:103/:111-118)、heartbeat(:128-133)。
- **Current Stage 読取**: `getField(stateContent, "Current Stage")`(:159)。none なら exit 0(:160)。
- graph 読取 → `stageNode`(:166-174)→ `applicableSensors = stageNode.sensors_applicable ?? []`(:178)。空なら exit 0(:179)。
- **per-entry dispatch**(:191-269): `if (!entry.matches) continue`(:192)→ `new Bun.Glob(entry.matches).match(filePathNorm)`(:193-194)→ マッチ時のみ `spawnSync("bun",[sensorTs,"fire",entry.id,"--stage",currentStage,"--output-path",filePath])`(:209-225)。
- 常に exit 0(:272、G5 advisory)。

### (g) テスト面

- **既存テスト前例(checkQuestionsEvidence + gate)**: `tests/integration/t-eoc1-gate-evidence.test.ts`。header covers 行(:1)`// covers: function:checkQuestionsEvidence(pass4,fail2) subcommand:amadeus-state:gate-start`、size: medium。import は `dist/claude/.claude/tools/amadeus-lib.ts` の checkQuestionsEvidence と amadeus-state.ts の handleGateStart(:13-14、**dist 経由** = shipped artifact をテスト)。fixture scaffold 様式(:22-28):`mkdtempSync(tmpdir, "eoc1-ev-")` に `requirements-analysis-questions.md` を writeFileSync、afterEach で rmSync。6 reason を `toEqual({kind,reason})` で全網羅(:31-63)。
- **sensor テスト前例**: `tests/unit/t-sensor-fire-seam.test.ts`(header covers `subcommand:amadeus-sensor:fire`、:1)。dispatcher の export seam(`stripProjectDir`/`scriptErrorOutcome`/`decideOutcomeOrScriptError`)を in-process 駆動、import は `dist/claude/.claude/tools/`(:9-26)。spawn-only の fire 本体を純関数へ抽出して lcov に載せる様式。sensorsDir を dist から import(:26)。
- **sensor 関連の他テスト**(`grep -rln sensor tests/`): t155-template-override / t190-validate-grid / gen-coverage-registry / t86-stage-protocol-section-13 等。graph の sensors_applicable 解決や template seam を検証。
- coverage 台帳: `tests/.coverage-registry.json`(+42 行、本区間で eoc1 テスト分が追記済み)、`tests/gen-coverage-registry.ts`(+1)。新テスト追加時は registry 再生成が必須(project.md integration-registry-regen)。

## A1 の判定

**A1 = YES(PostToolUse hook は questions ファイル書込みで発火可能)。**

実測根拠:
1. hook `amadeus-sensor-fire.ts` は Write/Edit の絶対 `file_path`(:76)を、Current Stage の `sensors_applicable` 各 entry の `matches` glob と `Bun.Glob(entry.matches).match(filePathNorm)`(:193-194)で照合し、マッチ時に dispatcher を spawn(:209)する。
2. questions ファイルは `<record>/<phase>/<slug>/<slug>-questions.md`(gate-start が組む同一パス、amadeus-state.ts:1725)= `.../amadeus/spaces/<space>/intents/<record>/...` 配下で `/intents/` セグメントを含む。
3. 既存 required-sections の matches `**/{amadeus-docs,intents}/**`(manifest :8)は、この絶対 questions パスに **Bun.Glob で match=true**(`bun -e` で実測: `/Users/x/amadeus/spaces/default/intents/260716-answer-preemption-guard/inception/requirements-analysis/requirements-analysis-questions.md` → true)。
4. かつ requirements-analysis は既に `sensors: [required-sections, upstream-coverage]` を宣言(:33-35)しており、questions ファイル書込みは producing stage が Current Stage の時点で起きる(gate 前)。→ 発火経路は今日すでに成立(required-sections は questions 書込みでも発火している)。

したがって新 sensor(例 `answer-preemption`)を対象 stage の `sensors:` に追加し、manifest の `matches` を questions ファイル(例 `**/*-questions.md` 相当、既存の広い glob でも可)へ向ければ、questions ファイルの Write/Edit ごとに checkQuestionsEvidence 相当の判定を発火できる。**hook 側の改修は不要**(既存の per-entry dispatch がそのまま新 entry を回す)。

留意点(実装時要判断、要件へ委譲):
- 発火は「producing stage が Current Stage の間の Write/Edit」に限る(hook :159-160)。gate-start ガード(b)は unpark→gate-start 時点の1回チェックで、sensor は書込みごとの連続チェック → 二者は相補(タイミングが異なる)。
- sensor は advisory(exit 0、audit 行のみ、G5)であり gate をブロックしない。ブロッキングは gate-start ガード(b)が担う。cutoff(GUARD_CUTOFF_YYMMDD=260716)を sensor 側に持たせるかは要件判断(sensor は fail-open advisory なので遡及ブロックの懸念は gate ほど強くない)。
- Bolt/unit の construction 段では questions パスが `<record>/construction/<unit>/<slug>/...` になりうる点、及び matches を狭める(`*-questions.md`)場合の Bun.Glob と dispatcher の bespoke globToRegex(amadeus-sensor.ts:835)の両エンジン整合(hook コメント :183-189 が `**/<seg>/**` 形を load-bearing と明記)は実装時に実測確認。

## 変更候補ファイル目録(実装ステージ向け、断定でなく候補)

正本(`packages/framework/core/`):
1. `sensors/amadeus-answer-preemption.md`(新規 manifest — id/kind/command/matches/default_severity/description/input_schema/output_schema/timeout_seconds)
2. `tools/amadeus-sensor-answer-preemption.ts`(新規 per-sensor script — checkQuestionsEvidence を amadeus-lib から import し、fail 理由を pass/findings_count の stdout JSON にマップ。required-sections が `errorMessage,parseBoltDag` を import する前例に倣う)
3. `amadeus-common/stages/**/<stage>.md`(対象 stage の frontmatter `sensors:` に `answer-preemption` を追加 — 少なくとも questions ファイルを産む inception/construction 系。対象集合は要件で確定)
4. (判断次第)`tools/amadeus-lib.ts` の checkQuestionsEvidence — 現状 export 済みで sensor から再利用可能。findings 詳細(どの行が先取りか)を返す拡張が要件なら戻り値を拡充。

生成物(同一変更で同期必須 — project.md Mandated):
5. `dist/<harness>/...`(`bun scripts/package.ts`)、self-install ツリー(`bun run promote:self`)、`dist:check`/`promote:self:check`。
6. sensor id を列挙する箇所(doctor の sibling-coverage、sensors dir index テスト)への伝播を grep で棚卸し。

テスト(`tests/`):
7. 新 sensor の in-process seam テスト(t-sensor-fire-seam / t-eoc1-gate-evidence 様式、dist import、6 reason → pass/fail の findings マップ網羅)。
8. `tests/.coverage-registry.json` 再生成(`gen-coverage-registry.ts`)+ EXPECTED_NONE_TO_CLI 追記(spawn-only 分)。
9. sensor manifest ↔ script ↔ stage sensors: の整合を検証する既存テスト(graph compile 系)への波及確認。
