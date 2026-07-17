# Re-scan 記録 — 260717-state-mirror-fixes(Issue #1170 + #1172)

## 実行メタデータ

- **Date**: 2026-07-18(Asia/Tokyo)
- **Intent**: `260717-state-mirror-fixes`(bugfix batch: [Issue #1170](https://github.com/amadeus-dlc/amadeus/issues/1170) — set-status hook 経由の state.md 巻き戻り(checkbox `[-]` と Current Stage の lost-update)/ [Issue #1172](https://github.com/amadeus-dlc/amadeus/issues/1172) — `countStageProgress` が scope-SKIP を分母に混入)
- **Scope**: `amadeus`
- **Project type**: Brownfield
- **Repository**: `amadeus`
- **Stage**: `reverse-engineering`(2.1)
- **手法**: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。既存 CodeKB のフルスキャンは行わない。
- **実施体制**: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)。Architect が同一 ref・コマンドで独立再照合し、重大な反証はなかった。

## Base / Observed

- **base**: `6495e03a12d9e7149c2e80b59f171a90607a2d2c`
  - `git merge-base --is-ancestor 6495e03a12d9e7149c2e80b59f171a90607a2d2c HEAD` → exit 0(祖先性実測)。
  - `git rev-list --count 6495e03a12d9e7149c2e80b59f171a90607a2d2c..591b6a2a222357f41061128f1b5a93c7f7a877be` → **126**(距離最小)。
  - 全 `re-scans/*.md` の observed のうち HEAD 祖先かつ距離最小を採用(cid:reverse-engineering:rescan-base-ancestry)。日付が新しい観測でも squash マージで feature tip が HEAD の非祖先になる observed(`0b5e24f8` 等の squash tip 群)は `--is-ancestor` exit 1 につき base 候補から除外した。
- **observed**: HEAD `591b6a2a222357f41061128f1b5a93c7f7a877be`(`git rev-parse HEAD` 実測、worktree = `origin/main` 一致)。
- **測定 ref**: 件数・行番号はすべて observed HEAD `591b6a2a2` の実ファイル直読(cid:measurement-ref-in-artifacts)。区間サマリのみ `git log 6495e03a..591b6a2a` を用いる。
- **Base の真実源**: 本ファイルおよび `inception/reverse-engineering/scan-notes.md` の到達可能な Observed commit。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## Focus と測定方法

対象は次の2 seam である。

1. **Issue #1170 seam**: state.md への書き込み経路の全数列挙(11 hook grep)+ set-status の read-modify-write race window の機序確定。
2. **Issue #1172 seam**: `scripts/amadeus-mirror.ts` の `countStageProgress` の SKIP 分母欠陥 + scope-SKIP の現行様式実測(format-currency-grep、cid:reverse-engineering:format-currency-grep-for-parser-intents)。

区間 `6495e03a..591b6a2a`(126コミット)の主テーマは新規 CLI 群(`scripts/amadeus-mirror.ts` #1169 が本 intent の #1172 対象 / `amadeus-norm-metrics.ts` / `amadeus-sensor-answer-evidence.ts` / metrics 系)・新ハーネス配布(OpenCode #1165 + Cursor #1163、dist 大量追加が区間 diff の主因)・engine(standing-delegation grant #1147、E-OC1 fail-closed #1106、state set fail-closed #1057、diary 自動生成 #1088)。**Focus seam(set-status の無ロック RMW と state ロック機構)は区間内で実質不変** — `amadeus-state.ts` の `withAuditLock` 行の追加削除は 0、`handleSetStatus` は区間内変更なし。`scripts/amadeus-mirror.ts` は #1169 で新規追加。

## 主要発見の要約(実測、機序確定)

### #1170 — set-status の無ロック RMW(pre-existing、base より前から現存)

- `handleSetStatus`(`packages/framework/core/tools/amadeus-utility.ts:3666-3690`)は `withAuditLock` を取らない無防備な read-modify-write。`:3679` で state をスナップショット読み(S0)→ setField×6 + setCheckbox `[-]` → `:3687` `writeStateFile` で S0 ベースの全文上書き。関数内に `withAuditLock`/`acquireAuditLock` 呼び出しは皆無(関数内 grep 0)。
- 対照: エンジン側 `amadeus-state.ts` の全 RMW ハンドラ(`handleSet:500`、`handleAdvance:1223`、`handleFinalize:1454`、`handleCompleteWorkflow:1573` 等)は `withAuditLock` 保護(`:251-266`)。
- `writeStateFile`(`amadeus-lib.ts:3562-3583`)の自己記述コメント(`:3578-3581`)が lost-update 未保護を明言 — atomic rename は torn-write 防止のみで、「Lost-update safety … is a SEPARATE, larger change tracked as a follow-up」。
- **唯一の非エンジン state.md 内容ライター**: `.claude/hooks/amadeus-sync-statusline.ts:69-73` の `Bun.spawnSync(["bun", toolPath, "set-status", …])` のみ(11 hook grep で他10 hook は read・breadcrumb・heartbeat のみ、内容書込なし)。TaskUpdate→in_progress ごとに発火し、engine report/advance と競合。
- **audit が健全な理由**: `handleSetStatus` は audit を一切 emit しない → 巻き戻りは state.md のみ。Issue #1170 の症状(audit 健全・state 巻き戻り)と完全一致。
- race: `B.read(S0) → A(エンジン).lock/write(S1) → B.write(S0')` で A の進行が古いスナップショット由来書込に上書きされ、checkbox `[-]` と Current Stage が巻き戻る。set-status は intent フラグなし(`:3667` `stateFilePath(projectDir)`)で active intent に解決するため、並行 builder/サブエージェントの set-status 同士も相互 lost-update。

### #1172 — countStageProgress の SKIP 語彙欠陥(#1169 で新規導入)

- `scripts/amadeus-mirror.ts:87-105` の `countStageProgress` は分母除外条件が checkbox `[S]`(`:100` `if (m[1] === "S") continue;`)のみ。
- **format-currency-grep 実測**: scope-SKIP の現行様式は `- [ ] <stage> — SKIP`(空 checkbox + 行末サフィックス)であり、`[S]` checkbox ではない。全 state 横断集計: `[ ] — SKIP` **717件** / `[ ] — EXECUTE` 70件 / `[x] — EXECUTE` 414件 に対し、`grep -rn '^- \[S\]' amadeus/spaces/default/intents/*/amadeus-state.md` = **0件**(`[S]` は実コーパスに1件も存在しない)。`[S]` は `--stage/--phase` jump 時の runtime marker で別語彙。
- 結果、scope-SKIP 行が `total++` に混入。260717-mirror-issue-tool の実データ(EXECUTE 18 / SKIP 14 / 全32行)で `countStageProgress` は 18/32 を返す(期待 18/18)— 症状再現確定。
- 根本原因: checkbox(実行状態、`setCheckbox` `amadeus-lib.ts:3785`)と suffix(計画、`setStageSuffix:3805`)は直交2フィールドだが、`countStageProgress` は checkbox だけ見て計画サフィックスを無視した。信頼できる分母信号は行末 `— EXECUTE`/`— SKIP`(計画)。

### テスト空白(2件)

- **t232 偽 green fixture**: `tests/unit/t232-amadeus-mirror.test.ts:72` の fixture が実在しない `[S]` 様式(`- [S] market-research — SKIP`)を捏造し `:82` で green。実様式 `[ ] X — SKIP` を fixture に含めていれば赤くなった(format-currency-grep-for-parser-intents 違反の典型)。修正 PR は実 state 由来 fixture を追加すべき。
- **t145 の set-status 未カバー**: `tests/integration/t145-state-lock-concurrency.test.ts` はエンジンハンドラ(`set`/`reject`/`approve`/`skip` 等 `:26-27`)のみ対象。`set-status` はテスト本体ヒット 0(`grep -rln 'set-status' tests/`)→ #1170 の実欠陥経路(hook 書込)は concurrency 未カバー。

## CodeKB 9成果物の更新判断

| 成果物 | 判断 | 根拠 |
|---|---|---|
| `business-overview.md` | 温存 | business domain・利用者・価値に変化なし |
| `architecture.md` | 温存 | component 境界・interaction・state ロック機構(core 中立層/表層境界)に変化なし |
| `code-structure.md` | 温存 | 新ハーネス配布ツリー・新 CLI は追加のみ。Focus seam の構造は区間不変 |
| `api-documentation.md` | 温存 | external/internal API 変更なし |
| `component-inventory.md` | 温存 | component 追加・削除・責務変更は Focus seam に及ばない |
| `technology-stack.md` | 温存 | runtime/framework/library/version 変更なし(gh は scripts 限定 cid:gh-scripts-boundary、新 runtime dependency なし) |
| `dependencies.md` | 温存 | external/internal dependency 変更なし |
| `code-quality-assessment.md` | **更新** | 本スキャン確定の2欠陥(無ロック set-status RMW / countStageProgress SKIP 語彙取りこぼし)+2テスト空白(t232 偽 green fixture / set-status concurrency 未カバー)を追記 |
| `reverse-engineering-timestamp.md` | **更新** | 本 intent を最新 freshness block へ追加し、旧「最新: 260717-codekb-diff3-cleanup」を履歴へ降格 |

## 質問0件案と Delivery Boundary

質問0件を選挙不要判定案として申告する。base 選定、set-status ライター全数列挙、race 機序、SKIP 様式集計、テスト空白、9成果物の更新要否は、既決 CID と git/コーパスの実測から機械導出できる。未決の Product / Architecture / AWS / Compliance 判断はない。leader 承認前に回答済みとは扱わない。

修正 intent が追加すべきリグレッション(bugfix posture):

1. **#1172**: 実 state 由来(`[ ] <stage> — SKIP`)fixture の `countStageProgress` テスト(18/18 assert)。
2. **#1170**: set-status の `withAuditLock` 参加(またはエンジンロックドメインへの統合)+ set-status ∥ advance の並列 spawn テスト(t145 様式拡張)。

本 scan では main merge/rebase、Issue close、GitHub 上のレビュー作成・更新操作を実施していない。
