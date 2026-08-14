# Requirements — Issue #2988: sensor 真理値表 fail-open の blocking gate 整列(intent 260814-failopen-error-paths)

## Intent 分析

blocking severity の sensor は Stage 完了の前提条件だが、sensor スクリプトの異常(非0 exit・壊れた JSON・spawn 失敗等)は真理値表(`packages/framework/core/tools/amadeus-sensor.ts:19-31` / `decideOutcome` `:612-735`)で `SENSOR_PASSED` + `Note: script-error: …` へ潰され、ゲート(`amadeus-state.ts` の `evaluateBlockingSensors` `:1932` / `evaluateBlockingSensorGuard` `:2023`)はイベント名の裸等価(`:1972`/`:1979`)だけで判定して Note を読まないため、異常が無音のゲート素通り(fail-open)になる。目標はこの経路を fail-closed へ整列すること — 「実行されなかった sensor は pass ではない」(`:2052`)と「実行してクラッシュした sensor は pass」の非対称の解消。

**設計裁定(semi 梯子 AUTO_DECIDED、questions file 参照)**: 修正形状は **B: 消費側強化**(Q1)。dispatcher は severity-blind by design(severity は compile `amadeus-graph.ts:813` とゲート `amadeus-state.ts:2004-2013` にのみ存在)であり、真理値表側の是正は advisory の挙動・監査形状へ必然的に波及するため、ゲート内へ封じ込める。advisory は現状維持(Q2)。述語射程は `script-error:` 前置 Note の全 arm(Q3)。隣接クリーンアップは (i)+(ii)(Q4)。

## 機能要件

### FR-1: blocking gate の script-error 不通過化
`evaluateBlockingSensors`(`amadeus-state.ts:1932-1995`)は、blocking sensor の最新 terminal 行が `SENSOR_PASSED` であっても、その `Note` が `script-error:` で始まる場合は pass と扱わず、不通過の finding を返す。受け入れ: `tests/fixtures/v05-mr9-sensor-fire/scripts/amadeus-sensor-stub-exit2.ts`(exit 2)/`-bad.ts`(bad JSON)を blocking manifest で発火させた監査に対し、ゲートが完了を拒否する。

### FR-2: 不通過 finding の可観測性
FR-1 の不通過は既存 `BlockingSensorFinding`(`amadeus-state.ts:1860-1863`)の語彙拡張(例: `script-error` kind)として表現し、ゲートの拒否メッセージに sensor id と Note 本文(診断)を含める。受け入れ: 拒否メッセージに `script-error: exit-2` 等の診断文字列が現れることをテストで実測。

### FR-3: 正当な PASSED 経路の不変
正常経路(exit 0 + well-formed JSON + `pass: true` → `SENSOR_PASSED` note なし、`amadeus-sensor.ts:695-696`)および `tool-unavailable`(exit 127、`:643-650`)の判定は変えない。受け入れ: 既存回帰(`t92.test.ts` Group E `:790-827` / test 44 `:1271-1300` / test 45 `:1310-1342`、`t-sensor-fire-seam.test.ts`、`t511-*`)が無変更でグリーン + 新規テストで note なし PASSED が引き続き pass することを実測。

### FR-4: advisory sensor の挙動不変
真理値表・dispatcher(`amadeus-sensor.ts`)・監査イベント語彙(`SENSOR_FIRED/PASSED/FAILED/BUDGET_OVERRIDE`)・otel registry は一切変更しない。advisory sensor の script-error は従来どおり `SENSOR_PASSED` + Note。受け入れ: `git diff` が `amadeus-sensor.ts`・`amadeus-audit.ts`・`otel/event-registry.ts` に触れていないこと。

### FR-5: 政策分界コメントと stale 言及の同期是正
(i) `amadeus-state.ts:2018-2022` の「真理値表は無変更のまま・fail-closed は集約のみ」というコメントを、本是正後の実態(ゲートは script-error 診断も消費する)へ更新する。(ii) `amadeus-sensor-schema.ts:21` の `verifyBlockingSensors` への stale な散文言及(#2986 移行の取り残し)を現行シンボル名へ是正する。受け入れ: 両箇所の grep 実測。

### FR-6: TDD による回帰テスト
実装前に失敗テストを追加し Red を実測してから最小実装で Green にする(team.md Testing Posture)。層: unit(`tests/unit/t511-blocking-sensor-severity.test.ts` — script-error Note 付き SENSOR_PASSED は pass でない)+ integration(`tests/integration/t511-blocking-sensor-gate.integration.test.ts` — blocking sensor が exit 2 / bad-output のとき approve/complete が拒否される)。既存 fixture(`makeForkSensors`・stub scripts・`amadeus-blocking-probe.md`)を再利用し新規 fixture は作らない。

### FR-7: 配送同一性
変更は `packages/framework/core/tools/` の正本のみ(追跡される `amadeus-sensor.ts` 系は 1 本、ゲートは `amadeus-state.ts`)。`bun run build` を manifest が発見する全ハーネスに対して実行し、追跡ファイルが不変であることを確認する(`cid:build-and-test:bt-dist-regen-seven-harnesses`、`cid:requirements-analysis:c2-acceptance-at-delivery-tree`)。

## 非機能要件

- **NFR-1(fail 方向)**: 新述語の失敗様式は fail-closed — Note 抽出の失敗・想定外の形は pass 側へ倒さない。
- **NFR-2(ゲート)**: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` 相当の PR blocking 集合(Project/Patch Coverage Gate 含む)を満たす。runtime dependency を追加しない。
- **NFR-3(検証劇場禁止)**: 新規テストは落ちる実証(注入 → 赤 → revert)を1セットで実施し、正当な既存データで赤くならないことも実測する。

## 制約

- dispatcher の severity-blind / thin routing surface 設計(`amadeus-sensor.ts:10-18`)を維持する(Q1=B の帰結)。
- t2771 のピン(`:151-163`)は**コメントテキストの drift-detector であり挙動ピンではない** — 「t2771 が緑だから fail-open が保存/除去された」という推論を検証に使わない(build-and-test への申し送り)。
- pair-closure 不変量(`amadeus-sensor.ts:16-17`: FIRED は必ず terminal 行と対、CLI は exit 0)を壊さない。

## 前提

- 患部は xrev-260814-2988 断面(52f1f1b25)から HEAD(cd64486a6)まで無変更(`re-scans/260814-failopen-error-paths.md` の currency 実測)。
- `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md` は本ワークスペースで活性な実 blocking sensor であり、本欠陥は実害経路を持つ(RE 実測)。

## スコープ外

- **Issue #3004**(recordEngineError の ambient フォールバック)— 別 worktree の PR #3011 で対応中(ユーザー裁定 2026-08-14)。
- **tool-unavailable(exit 127)の fail-open** — 別設計の寛容ブランチ。変更は仕様変更でありユーザー専権。follow-up Issue 起票の要否を承認ゲートで提示する(Q3)。
- **真理値表コメント(`:19-31`)の 7 arm vs 11 return site drift** — shape B では実装を触らない面の文書整備。必要なら follow-up(Q4)。
- 既着地の監査行の revert、advisory sensor の挙動変更、監査イベント語彙・otel registry の変更。

## 未解決事項

- tool-unavailable fail-open の follow-up Issue 起票要否(承認ゲートでユーザーへ提示)。

## 上流入力

- consume: `codekb/amadeus/business-overview.md` / `architecture.md` / `code-structure.md` — いずれも本 intent の RE で「レビュー済み・無変更」面(本 intent の節を持たない)。本書はこれらから一般文脈のみを受け取り、本 intent の事実は RE 更新面(`code-quality-assessment.md` 現在節、`re-scans/260814-failopen-error-paths.md`)から引いた(`cid:requirements-analysis:c4-consume-header-is-not-citable-content`)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T07:36:38Z
- **Iteration:** 1
- **Scope decision:** none

requirements.md は Step 10 必須7節を備え、7 FR(Minimal 帯域内)全てに具体的な受け入れ検査を持つ。FR 集合は Issue #2988 の完了条件3件と Q1-Q4 の AUTO_DECIDED 裁定へ矛盾なくトレースし、スコープ外宣言(#3004・tool-unavailable・コメント drift)と整合。上流入力宣言どおり、消費3面から本 intent 固有の事実を引いていない。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260814-failopen-error-paths/inception/requirements-analysis/requirements.md | FR-2 の BlockingSensorFinding 新語彙が例示(script-error kind)に留まる — code-generation ゲートで確定名と受け入れテストの一致を確認する
- FOLLOW-UP | amadeus/spaces/default/intents/260814-failopen-error-paths/inception/requirements-analysis/requirements.md | tool-unavailable follow-up Issue の起票実行主体が未記載(ゲートで諮る際に併せて確定)
- NIT | amadeus/spaces/default/intents/260814-failopen-error-paths/inception/requirements-analysis/requirements.md | FR-4 の受け入れ検査(git diff 不変)は FR より制約寄りの記述
