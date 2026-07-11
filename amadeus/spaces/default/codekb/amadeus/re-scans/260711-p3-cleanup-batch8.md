# Re-scan 記録 — 260711-p3-cleanup-batch8

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `9738580ef`(前回 observed = re-scans 最新の observed 由来。2026-07-10 15:21:05 +0900 / "fix #734 自前 project カバレッジゲート #762")
- **observed**: `60f5e1edf`(`git rev-parse HEAD` 実測。2026-07-11 21:50:52 +0900 / "fix(engine): record ERROR_LOGGED for orchestrate error exits (#839) (#879)")
- **date**: 2026-07-11
- **intent**: `260711-p3-cleanup-batch8`(P3 修理7件 — #843 stage-protocol.md persona 注入残存 / #846 sensor・validate ツールの無条件 main() import 副作用 / #850 audit-fork one-shot ガードの復活拒否 / #851 issue-ref-contract.md 全面不在 / #876 computeStrippableLines の brace-only 行 strip 漏れ / #877 run-tests バッチ時の persist seam 分離不全 / #878 orchestrate default 出口の recordEngineError 非配線)
- **scope**: bugfix
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。差分区間 `9738580ef..60f5e1edf`(全体 294 files, +25889/-3508)。フォーカス7 Issue の file:line は現行 HEAD の実コード直読で再確定。base/observed の真実源は本ファイルと `inception/reverse-engineering/scan-notes.md`。
- **実施体制**: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)

## focus(スキャンスコープ)

- **#843 persona 注入残存(区間外・restart-loss)**: `packages/framework/core/amadeus-common/protocols/stage-protocol.md:611-614`(subagent 節の persona 注入指示)+ `:842-843`。base 9738580ef でも同一。
- **#846 無条件 main()(区間外・restart-loss)**: `packages/framework/core/tools/amadeus-sensor-required-sections.ts:229` / `amadeus-sensor-upstream-coverage.ts:111` / `amadeus-validate.ts:305` の末尾無条件 `main()`。参照実装 = `amadeus-learnings.ts:916`(`if (import.meta.main) main();`)。
- **#850 audit-fork one-shot ガード(区間外・restart-loss)**: `packages/framework/core/tools/amadeus-audit.ts:471-475`(wtAuditPath 存在のみで一律拒否、reentrant/DIVERGED 判定欠如)。lib gap2(slug 正規化一本化)は toLowerCase seam 散在(`:746`/`:1828`/`:1980`)を functional-design で突き合わせ要。
- **#851 issue-ref-contract.md 不在(区間外・restart-loss)**: 正本 = `packages/framework/harness/<name>/skills/amadeus/references/issue-ref-contract.md`(全面 0 件、base でも不在)。同種サイドカー `question-rendering.md` の実配置は正本4面+dist4面+self-install2面=計10面。harness スコープ(どのハーネスに配るか)は Architect 合成で確定要。
- **#876 computeStrippableLines(区間内・新規)**: `tests/lib/coverage-normalize.ts:40`(定義)、欠陥箇所 code モード `:117`(`{` markCode)/ `:126-132`(`}` markCode)/ `:135`(非空白 markCode)。brace-only 行(`}` `};` `});`)が全て code-bearing にマークされ `:190-193` の `!codeBearing.has(ln)` で strippable から外れる。base に不在の新規ファイル(+284)。
- **#877 run-tests persist seam 分離(区間内・新規)**: `tests/run-tests.ts:692`(`runBunTestFile` = 1ファイル/1invocation、`:748-756` spawn 単一 file)。現行ランナーは複数ファイルを同一 bun プロセスにバッチ**しない**(per-file 隔離)。干渉相手 = `tests/unit/t-learnings-persist-seam.test.ts`(新規、`:15` handlePersist in-process import、`:40-61` callPersist の process.exit/stderr グローバル monkey-patch)+ 共有 `tests/harness/fixtures.ts`(`resetAidlcEnv` の env 変異)。再現は手動 `bun test tests/unit`(ディレクトリ一括)経路のみ。
- **#878 orchestrate default 出口(区間内・#879 導入ギャップ)**: `packages/framework/core/tools/amadeus-orchestrate.ts:2995-3001`(default: `console.error` + `process.exit(1)`、throw しない)。`recordEngineError` 定義 `:195`、配線は `runEngineMain` try/catch `:3017` のみ。#879(= observed HEAD)が recordEngineError を導入したが default 出口は未配線。base 9738580ef には recordEngineError が存在しない。

## 差分の焦点影響(`9738580ef..60f5e1edf`)

- `git diff --name-only 9738580ef..60f5e1edf | grep -E "sensor-required-sections|sensor-upstream-coverage|amadeus-validate.ts|amadeus-audit.ts|stage-protocol.md|issue-ref-contract"` → **NONE**。restart-loss 4件(#843/#846/#850/#851)の欠陥ファイルは区間内で一切変更されず、base 時点で既に現存する既存欠陥。
- 区間**内**で導入・変更された面は #876(`tests/lib/coverage-normalize.ts` 新規)/ #877(`tests/run-tests.ts` 削減 98行 + `t-learnings-persist-seam.test.ts` 新規)/ #878(`amadeus-orchestrate.ts` に #879 で recordEngineError 導入)の3件のみ。
- **フォーカス面への影響の帰結**: restart-loss 4件は区間外(既存欠陥)、#876/#877/#878 は区間内(それぞれ 要件見落とし由来 / テストインフラ由来 / #879 導入ギャップ)。

## E-L53 3点法(restart-loss 4件)

| Issue | (a) archive 元修正 SHA + 要点 | (b) 現行欠陥の現存(現行正本パス) | (c) 喪失は区間内/外 |
|---|---|---|---|
| #843 | `4d5a0f5a5`(旧 `.../amadeus-common/protocols/stage-protocol.md` を persona 注入→自動読込へ) | `packages/framework/core/amadeus-common/protocols/stage-protocol.md:611-614` | 区間外 |
| #846 | `657dc9267`(旧 `.agents/amadeus/tools/` の sensor/validate 群に `import.meta.main` ガード付与) | `amadeus-sensor-required-sections.ts:229` / `amadeus-sensor-upstream-coverage.ts:111` / `amadeus-validate.ts:305` | 区間外 |
| #850 | `63314bc82`(旧 `.agents/amadeus/tools/amadeus-audit.ts` reentrant + `amadeus-lib.ts` normalizeWorktreeSlug) | `amadeus-audit.ts:471-475`(one-shot 一律拒否) | 区間外 |
| #851 | `589687a19`(旧 `.agents/skills/amadeus/references/issue-ref-contract.md` 47行を新規作成) | `packages/framework/harness/<name>/skills/amadeus/references/issue-ref-contract.md` 不在 | 区間外 |

**読み替え**: archive 側は旧系譜パス(`.agents/amadeus/tools/...` / `.agents/skills/...` / 旧 `aidlc/` ワークスペース)。現行正本は `packages/framework/core/...` または `packages/framework/harness/<name>/skills/...` へ読み替える。旧パス直移植は不可(レイアウトが変わっている)。喪失境界はワークスペース再スタート(`.agents/`・`aidlc/` → `packages/framework/`)であり差分区間外。

## 焦点影響(合成が反映した先)

- `code-quality-assessment.md` — 先頭に「p3-cleanup-batch8(2026-07-11)の観測面」節を新設(7欠陥の観測面を scan-notes の file:line/分類へ接地。restart-loss 4件と区間内3件を区別)。前 intent(p3-cleanup-batch5)の先頭バナー/節見出しの「最新/本 intent」→履歴ラベル化(c3-relabel)。
- `architecture.md` — 「orchestrate エラー監査経路の部分配線(#879/#878、2026-07-11)」構造節を追補(recordEngineError 導入と default 出口未配線の非対称)。top banner の「最新 = core-repair-batch3」を履歴ラベルへ更新。
- `reverse-engineering-timestamp.md` — 本 intent メタで鮮度ポインタ更新(前 intent batch5 節を履歴ラベル化、温存)。
- その他成果物(business-overview / api-documentation / code-structure / component-inventory / dependencies / technology-stack)は base→observed で本 intent 観測面と無関係のため温存(churn 回避)。
