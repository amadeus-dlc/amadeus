# Developer Code Scan — reverse-engineering(intent 260814-failopen-error-paths)

> 実行主体: amadeus-developer-agent サブエージェント(read-only)。Report ref: HEAD `cd64486a68c6a1144db50fbe3fde8273f5e18455`(= origin/main)。焦点: Issue #2988。scan mode: xrev differential(run xrev-260814-2988、target-sha `52f1f1b25`、2名 CONFIRMED_WITH_REFINEMENTS)。
>
> Currency(サブエージェントが独立再測定): `git log --oneline d7ffaa544..HEAD -- packages/framework/core/tools/amadeus-sensor.ts packages/framework/core/tools/amadeus-state.ts tests/integration/t2771-lifecycle-guard-regression.integration.test.ts` → 0 commits / exit 0。`git diff --stat 52f1f1b25 HEAD -- <同3面 + tests/unit/t511-blocking-sensor-severity.test.ts>` → 空 / exit 0。差分ベース d7ffaa544 は患部に寄与なし → 患部については実質フルスキャン。

## 1. 真理値表コメントと実装(HEAD 逐語)

コメント: `packages/framework/core/tools/amadeus-sensor.ts:19-31`(逐語確認済み、Issue #2988 の引用と一致):

```
19:// Truth-table branch ordering — locked, branch a precedes branch 0:
20://   a) signal === "SIGTERM" AND elapsed ≥ timeout - GRACE  → BUDGET_OVERRIDE
21://   0) error AND status===null AND signal===null           → PASSED script-error: spawn-failed
22://   b) status === 127                                       → PASSED tool-unavailable
23://   c) status === 0 AND JSON.pass === false                 → FAILED
24://   d) status === 0 AND JSON.pass === true                  → PASSED
25://   e) status non-0/non-127 (non-timeout)                   → PASSED script-error: exit-<n>
26://   f) bad JSON / missing pass                              → PASSED script-error: bad-output
27://   default                                                 → PASSED script-error: unknown
```

実装: `function decideOutcome(...)` `amadeus-sensor.ts:612-735`。ブランチ→コード対応:

| Branch | コメント行 | コード行 | 述語 | 結果 |
|---|---|---|---|---|
| a (timeout) | :20 | :620-631 | SIGTERM ∧ elapsed ≥ timeout−GRACE | `budget-override` (:627) |
| 0 (spawn-failed) | :21 | :633-641 | error ∧ status null ∧ signal null | `passed` + note `script-error: spawn-failed: …` |
| b (127) | :22 | :643-650 | status === 127 | `passed` + note `tool-unavailable` |
| f (parse throw) | :26 | :659-666 | JSON.parse catch | `passed` + note `script-error: bad-output` |
| f (pass 欠落/非bool) | :26 | :668-674 | !isPlainObject ∨ typeof pass ≠ boolean | `passed` + note `script-error: bad-output` |
| c (FAILED) | :23 | :676-694 | pass === false | `failed` (:689) |
| d (正常 PASS) | :24 | :695-696 | status 0 ∧ pass true | `passed`、**note なし** |
| e (external SIGTERM) | :25相当 | :699-709 | SIGTERM ∧ elapsed < timeout−GRACE | `passed` + note `script-error: external-sigterm` |
| e (非0 exit) | :25 | :711-717 | status !== null | `passed` + note `script-error: exit-${status}` |
| e′ (非SIGTERM signal) | 表に無し | :721-727 | signal !== null | `passed` + note `script-error: signal-${signal}` |
| default | :27 | :730-734 | 無条件 | `passed` + note `script-error: unknown` |
| (throw fold) | 表外 | :745-751 `scriptErrorOutcome` | spawn 同期 throw | `passed` + note `script-error: spawn-threw: …` |
| (detail 書込失敗) | 表外 | :588-593 | detail write throw | `failed`→`passed` へ降格 + note `script-error: detail-write-failed: …` |

**コメント/実装 drift(HEAD 既存)**: コメントは 7 arm、実装は 11 return site(9 が `passed`)。`external-sigterm`(:706)/`signal-<n>`(:723)/`detail-write-failed`(:592)はコメント表に無い。

`FireOutcome` は `amadeus-sensor.ts:87-95` の閉集合 `"passed" | "failed" | "budget-override"`。

## 2. 消費側 — verifyBlockingSensors の現在地と fail-closed 論理

`verifyBlockingSensors` は **shipped source にシンボルとして不在**(`git grep -n "verifyBlockingSensors"` は codekb/intent record/t2771-checkpoints テストヘッダのみ、`packages/` 0 hit)。codekb の `amadeus-state.ts:1835` 引用は stale。

現行実装(いずれも `packages/framework/core/tools/amadeus-state.ts`):
- **Guard adapter** `evaluateBlockingSensorGuard(context): LifecycleGuardVerdict` — `:2024-2069`。off-switch `:2027-2029`(`AMADEUS_SKIP_BLOCKING_SENSOR_GUARD === "1"`、`:1997-1999`)。日付 cutoff `:2034-2037`(`BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809`、`:846`)。fail-closed 宣言文字列は `:2050-2052` — verbatim: `"A blocking sensor that never ran is not a pass."`(repo 内 packages/ で単一 hit)。
- **Decision core** `evaluateBlockingSensors(blockingSensorIds, audit, stageSlug, currentDigest?)` — `:1932-1995`。`BlockingSensorFinding` = `"never-fired" | "unresolved" | "stale"`(`:1860-1863`)。

**消費形状(核心)**: 監査 trail を読む。`sensorRowsForStage`(`:1890-1913`)が `["SENSOR_FIRED", ...SENSOR_TERMINAL_EVENTS]` を歩き、`Stage slug` / `Sensor ID` / `Output path` / `Output digest` / `Fire id` の5フィールドのみ抽出(`:1898-1903`)。pass 判定はイベント名の裸等価: `:1972` `latest?.event === "SENSOR_PASSED" && latest.receiptMatches && …`、`:1979` `terminal?.event !== "SENSOR_PASSED" || !terminal.receiptMatches → unresolved`。

**つまりゲートに届く「PASSED」は監査イベント名 `SENSOR_PASSED` そのもの**(emitter `amadeus-sensor.ts:870`、script-error note 付きでも同じイベント)。`Note` フィールドは `:866-869` で付与されるが**どの消費者も読まない**(repo-wide grep: emitter `amadeus-sensor.ts:868` / `otel/event-registry.ts:893` / `otel/redaction.ts:98` の3 hit のみ、判定用読者ゼロ)。これが #2988 の機械的根本: 診断は記録されるが、ゲートは構造的に見えない。

ゲートが既に fail-closed 化している面: fire による先行 terminal 無効化(`:1954`)、receipt/digest 束縛(`:1966-1971`)、同時刻 tie-break は failure 優先(`:849-852`)。

## 3. 回帰ピン t2771

`tests/integration/t2771-lifecycle-guard-regression.integration.test.ts:151-163` — `test("the sensor truth table's fail-open arms are untouched")`。`readFileSync` + `toContain` で**コメント行 :25-:26 の逐語テキストのみ**をピン(挙動は一切ピンしない)。テスト自身のコメント(:152-154)が「既知逸脱、別途是正、将来の編集を decision にするためのピン」と宣言 — #2988 是正を先取りした drift-detector。同 describe の隣接ピン(:132-144 の AMADEUS_SKIP_* 4名、:146-150 の cutoff)は壊してはならない。

## 4. severity 語彙 — 宣言→実行→verdict→ゲートの鎖

1. 閉集合: `amadeus-sensor-schema.ts:41` `SENSOR_SEVERITIES = ["advisory", "blocking"]`。doc `:35-40`: "'blocking' is consumed by the approval guard … Runtime carriage is via the compiled stage graph (SensorResolution.severity), not the audit row."
2. 宣言: manifest frontmatter `default_severity:`(必須 `:48,:61`、閉語彙検証 `:146-157`)。
3. shipped blocking は 2 hit のみ: `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5`(実配布・本ワークスペースで活性)と `tests/fixtures/blocking-sensor/amadeus-blocking-probe.md:5`(fixture)。core 14 sensor は全て advisory。
4. compile 搬送: `amadeus-graph.ts:813-815`(advisory は省略デフォルト)。型 `:144` `severity?: SensorSeverity`。
5. ゲート消費: `amadeus-state.ts:2004-2013` `blockingSensorIdsForStage` が `sensors_applicable[].severity === "blocking"` を収集。
6. 実行側 `amadeus-sensor-fire.ts:208` は severity を見ず全件発火。**dispatcher(amadeus-sensor.ts)は severity-blind — severity は compile とゲートにのみ存在し、真理値表は見えない。** よって真理値表側の是正は blocking 限定にできない(新配管なしでは)。

消費側の in-source 逸脱記録: `amadeus-state.ts:2018-2022` — "The sensor's own PASSED/FAILED truth table (amadeus-sensor.ts) is the policy content of an individual guard and is left exactly as it was — the Runtime's fail-closed rule governs aggregation, not what a sensor decides."

## 5. 配送面

追跡ファイルは `packages/framework/core/tools/amadeus-sensor.ts` の**1本のみ**(`git ls-files | grep -E 'amadeus-sensor\.ts$'`)。ディスク上コピー14(self-install 5 + dist 8 + 正本)は正本以外すべて untracked(`.gitignore:24:/.claude/**`、dist はグローバル ignore)。HEAD 時点で self-install 5 面は正本と byte 一致(`diff -q` ×5)。harness は 8 dir(claude/codex/cursor/kimi/kiro/kiro-ide/opencode/pi)。core 変更後は `bun run build` 全 harness + 追跡ファイル不変確認(`cid:build-and-test:bt-dist-regen-seven-harnesses`)。

## 6. 修正形状ランドスケープ(未裁定)

verdict 語彙: `FireOutcome`(3値)/ 監査 terminal `SENSOR_PASSED|SENSOR_FAILED|SENSOR_BUDGET_OVERRIDE`(`amadeus-audit.ts:188-191`、`amadeus-state.ts:852` に再宣言)/ `BlockingSensorFinding`(3値)/ `SENSOR_SEVERITIES`(2値)/ `LifecycleGuardVerdict`。

消費側の pass 判定は `event !== "SENSOR_PASSED"` → 自動的に fail-closed(unresolved)。新 terminal イベントを導入する場合の必須配線: `SENSOR_TERMINAL_EVENTS`(`amadeus-state.ts:852`)/ 監査閉集合+表示 map(`amadeus-audit.ts:188-191`,`:297-298`)/ otel `event-registry.ts:880-893`(event-registry-drift sensor が欠落検出)/ pair-closure 不変量(`amadeus-sensor.ts:16-17` "always emit a paired terminal row"・"Exit 0")。

advisory の script-error の現在地: 同一経路(`SENSOR_PASSED` + Note)。`SENSOR_PASSED` の読者: gate(`:1972/:1979`)、`amadeus-runtime.ts:732→:741`(Note 非読)、`amadeus-stage-stats.ts:409`、`amadeus-stage-attribution-candidates.ts:122`、`amadeus-stage-attribution-report.ts:152`。**Note の判定読者はゼロ。**

| Shape | 変更点 | 影響半径 | t2771 ピン |
|---|---|---|---|
| A. 真理値表変更(e/f 等を新イベント or FAILED へ) | FireOutcome + emitTerminal + 監査閉集合 + otel + SENSOR_TERMINAL_EVENTS | advisory の監査形状も変わる(severity-blind のため)。runtime 集計・stage-stats・attribution・`audit-format.md:249-261` に波及 | :156-161 要変更 |
| B. 消費側強化(gate が Note `script-error:` 前置の SENSOR_PASSED を不通過扱い) | `sensorRowsForStage` に Note 抽出 + pass 述語 + `BlockingSensorFinding` に新 kind | ゲート内に封じ込め。advisory・監査形状・doc/otel 不変 | :156-161 **不変のまま真** |
| C. A+B 両方 | 両者の和 | 最大 | 要変更 |
| D. dispatcher に severity 配管 | 新 flag/graph 読取。「dispatcher は thin routing surface」設計(`:10-18`)と `:2018-2022` の政策分界コメントに反する | 新結合 | 要変更 |

既存テストへの影響: `tests/integration/t92.test.ts` Group E `:790-827`(`Note = "script-error: exit-2"` :799 / `"script-error: bad-output"` :810)、`:1271-1300`(test 44)、`:1310-1342`(test 45: 正常 PASS は script-error でないこと)。**A/C/D は4件全て要書換、B は全て不変。** `tests/unit/t-sensor-fire-seam.test.ts:83-131,:259` も同様(A系で要書換)。`tests/e2e/t-formal-verif-model-completeness-sensor.test.ts:323` は「sensor スクリプト自身が FAILED を選ぶ」既存 sanctioned パターンの前例。

## 7. テストインフラ

- unit: `tests/unit/t-sensor-fire-seam.test.ts` が唯一の導出 seam 直叩き(`scriptErrorOutcome` `:745` / `decideOutcomeOrScriptError` `:758` — `decideOutcome` 自体は非 export。injected-spawn thunk `:758-771` が新規 unit ピンの自然な seam)。
- gate unit: `tests/unit/t511-blocking-sensor-severity.test.ts`(26 tests。`evaluateBlockingSensors` 決定表 `:138-`。shape-B 回帰テストの自然な置き場)。
- integration: `tests/integration/t511-blocking-sensor-gate.integration.test.ts`(approve/complete/advance/finalize 経路。end-to-end ピン「blocking sensor script exit 2 → approve 拒否」の置き場)。
- fixture: `tests/fixtures/v05-mr9-sensor-fire/scripts/`(`-exit2.ts` = branch e、`-bad.ts` = branch f、ほか)。seam: `AMADEUS_SENSORS_DIR` + `AMADEUS_SENSOR_SCRIPT_DIR`(`t92.test.ts:100-135`)。fork-manifest builder `makeForkSensors`(`t92.test.ts:242`)。blocking manifest fixture `tests/fixtures/blocking-sensor/amadeus-blocking-probe.md`。**失敗テストの新規 fixture は不要 — 全部品が既存。**

## Issue 完了条件の足場

- (a) 正常経路: `amadeus-sensor.ts:695-696`(`// Branch d — PASSED` / `return { kind: "passed", durationMs: elapsedMs };`)。status 0(:653)→ JSON.parse 成功(:659)→ pass boolean(:668)→ pass !== false(:676)経由。`SENSOR_PASSED` note 無し。是正後も note-free/event-stable を維持しないと t92 test 45 が赤。
- (b) 同期対象: `amadeus-sensor.ts:19-31`(コメント)+ `:612-735`(実装)+ t2771 `:151-163`(テキストピン)。イベント語彙を動かす場合は追加で `amadeus-audit.ts:188-191`/`:297-298`、`amadeus-state.ts:852`、`otel/event-registry.ts:880-893`、`packages/framework/core/knowledge/amadeus-shared/audit-format.md:249-261`(`:259` の Note 脚注は現行 fail-open 契約の prose 記述)。

## Issues / Concerns

- BLOCKER(RE 統合の正確性): codekb の `verifyBlockingSensors` = `amadeus-state.ts:1835` 引用が stale(`api-documentation.md:56,58,80` / `code-quality-assessment.md:173` / `component-inventory.md:69`)。現行名は `evaluateBlockingSensorGuard`(`:2024`)/ `evaluateBlockingSensors`(`:1932`)/ 宣言文字列 `:2052`。RE リフレッシュで是正要。
- BLOCKER(修正形状制約): dispatcher は severity-blind by design。真理値表側の是正(A/C)は必然的に advisory の挙動も変える — Issue 本文に無い最重要制約。
- FOLLOW-UP: t2771 ピンはコメントテキストのみの drift-detector であり挙動ピンではない(shape B では緑のまま)。requirements で明示要。
- FOLLOW-UP: コメント/実装 drift(7 arm vs 11 return site)は #2988 と独立に既存。`:19-31` を触るならほぼ無償で閉じられる。
- FOLLOW-UP: `pr-convergence-report-format` は本ワークスペースで活性な実 blocking sensor — #2988 は仮説でなく実害経路を持つ。
- NIT: t2771:147 の cutoff ピンは非 export 再宣言でも通る substring match。
- NIT: `amadeus-state.ts:2018-2022` の fail-open 擁護コメントは是正と同一変更で更新/削除要。
