# re-scan 記録 — 260814-failopen-error-paths

## メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-14` |
| Intent | `260814-failopen-error-paths`（scope `self-fix`、depth `Minimal`、Brownfield、単一 repo `amadeus`、build `bun`） |
| Base commit | `d7ffaa5442266508d8e67babc3e0b947fb4c1637` |
| Observed commit | `cd64486a68c6a1144db50fbe3fde8273f5e18455`（= 本 worktree HEAD = `origin/main`） |
| Focus | [Issue #2988](https://github.com/amadeus-dlc/amadeus/issues/2988)（sensor 真理値表がスクリプト異常を `PASSED` へ倒す fail-open） |
| スコープ外（明示） | [Issue #3004](https://github.com/amadeus-dlc/amadeus/issues/3004) — PR #3011 で別途処理中。本 scan は一切扱わない |
| Scan mode | **xrev differential scan**（run `xrev-260814-2988`、target-sha `52f1f1b25`、2 名とも `CONFIRMED_WITH_REFINEMENTS`） |
| 書込範囲 | `codekb/amadeus/` 配下のみ（コード・テスト・state・audit・git 状態・GitHub の変更ゼロ） |

### base 選定根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` が記録する全 observed のうち、**HEAD の祖先で距離最小**のものを選んだ（`cid:reverse-engineering:rescan-base-ancestry`）。

| 述語 | 結果 |
|---|---|
| `git merge-base --is-ancestor d7ffaa5442266508d8e67babc3e0b947fb4c1637 HEAD; echo $?` | `0`（祖先） |
| `git rev-list --count d7ffaa544..HEAD` | **4**（最小 → 採用） |

`d7ffaa544` は直前 intent `260814-coverage-quick-norm` の observed。

### observed 選定根拠

`git rev-parse HEAD` = `cd64486a68c6a1144db50fbe3fde8273f5e18455`、`git rev-parse origin/main` も同値。`origin/main` 系譜のコミットでありローカル merge コミットではない（`cid:reverse-engineering:c2-observed-mainline-commit`）。

## scan mode と行番号引用の currency

クロスレビュー run `xrev-260814-2988`（reviewer 2 名とも `CONFIRMED_WITH_REFINEMENTS`、target-sha `52f1f1b25`）の verdict を Developer scan の一次入力とし、Architect が observed 断面で再照合した。

currency 根拠（**実測の記録であり免除の主張ではない**。Developer scan がサブエージェントとして独立に再測定した出力からの転記）:

| # | 述語 | 結果 |
|---|---|---|
| C-1 | `git log --oneline d7ffaa544..HEAD -- packages/framework/core/tools/amadeus-sensor.ts packages/framework/core/tools/amadeus-state.ts tests/integration/t2771-lifecycle-guard-regression.integration.test.ts` | **0 commits / exit 0** |
| C-2 | `git diff --stat 52f1f1b25 HEAD -- <C-1 の 3 面 + tests/unit/t511-blocking-sensor-severity.test.ts>` | **空出力 / exit 0** |

C-1 より差分ベース `d7ffaa544` は患部に一切寄与しない → **患部については実質フルスキャン**であり、全主張を observed 断面の実読で採取した。C-2 より xrev 断面（`52f1f1b25`）と observed 断面（`cd64486a6`）は患部について同一であり、verdict の行番号は observed でそのまま解決する（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。

**表現形式の移行検査**（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: C-1 / C-2 がいずれも空である以上、区間内に患部のスキーマ・分岐形式・イベント語彙を変える移行 PR は存在しない → c5 の構造的不成立条件には該当しない。

## Architect による独立再照合（本記録で新たに実測した分）

Developer scan からの転記ではなく、Architect が本 scan で実行した測定のみをここに列挙する（測定 ref = observed `cd64486a6`、実行位置 = worktree ルート）。

| # | 述語 | 結果 |
|---|---|---|
| A-1 | `git grep -n "evaluateBlockingSensorGuard\|function evaluateBlockingSensors\|never ran is not a pass\|blockingSensorGuardDisabled\|blockingSensorIdsForStage" -- packages/framework/core/tools/amadeus-state.ts` | exit 0。`:347`（registry 結線 `evaluate: evaluateBlockingSensorGuard,`）/ `:1932`（`export function evaluateBlockingSensors(`）/ `:1997`（`function blockingSensorGuardDisabled()`）/ `:2004`（`function blockingSensorIdsForStage(`）/ `:2023`（`function evaluateBlockingSensorGuard(`）/ `:2027` / `:2030` / `:2052`（`message += "unknown. A blocking sensor that never ran is not a pass.";`） |
| A-2 | `sed -n '2018,2032p;2050,2054p;2065,2072p' packages/framework/core/tools/amadeus-state.ts` | 政策分界コメントは `:2018-2022`（末尾逐語 `fail-closed rule governs aggregation, not what a sensor decides.`）、`evaluateBlockingSensorGuard` 本文は `:2023-2068` |
| A-3 | `git rev-parse HEAD` / `git rev-parse origin/main` | いずれも `cd64486a68c6a1144db50fbe3fde8273f5e18455` |
| A-4 | `git merge-base --is-ancestor d7ffaa544… HEAD; echo $?` / `git rev-list --count d7ffaa544..HEAD` | `0` / `4` |
| A-5 | `git grep -n "verifyBlockingSensors" -- packages/` | exit 0 / **1 hit** = `packages/framework/core/tools/amadeus-sensor-schema.ts:21`（散文コメント `// terminal verdict (amadeus-state.ts` / `// verifyBlockingSensors).`）。**定義・呼出は 0 件** |

**Developer scan への訂正 2 件**（`cid:requirements-analysis:absence-claim-grep-verify` / `cid:reverse-engineering:c6-absence-predicate-exit-code` の系）:

1. **行番号**: Developer scan §2 は Guard adapter を `:2024-2069` と記す。A-1 の `git grep -n` 実測では宣言行は **`:2023`**、A-2 で本文終端は **`:2068`**。1 行の採番ずれ（行シフト起因ではなく採番誤り）。**訂正後が正本**。
2. **不在主張の粒度**: Developer scan §2 は「`packages/` 0 hit」と記すが、A-5 の実測は **exit 0 / 1 hit**。残存 1 件は `amadeus-sensor-schema.ts:21` の**散文コメント内の stale な言及**であり、シンボル定義・呼出が 0 件であるという結論自体は不変。ただし「0 hit」という書き方は不正確であり、**訂正後が正本**。この散文 1 件は #2986 移行時に取り残された未是正の drift であり、#2988 の是正が `amadeus-sensor-schema.ts` に触れるなら同一変更で閉じられる（FOLLOW-UP）。他の file:line は本記録で個別再測定していないため、Developer scan（`<record>/inception/reverse-engineering/developer-scan.md`）の実測を一次記録とする。

## 更新した codekb 面

| ファイル | 変更 |
|---|---|
| `code-quality-assessment.md` | **新現在節**「sensor 真理値表の fail-open と、severity-blind な dispatcher という制約」（Q-1〜Q-7 + 配送面）。直前の現在節 `260814-t99-copytree-race` を履歴へ降格。**現在マーカーを併存させていた** `260814-t528-ambient-isolation` 節も同時に履歴へ降格。`260813-lifecycle-guard-runtime` 節（履歴）の Q-1 表へ stale 引用の訂正注記を追加 |
| `api-documentation.md` | `260813-lifecycle-guard-runtime` 節（履歴）へ stale 引用の訂正注記を追加（**本 intent の新規節は無い**） |
| `component-inventory.md` | 同上（C2 表の G7 / G8 行に対する訂正注記。**本 intent の新規節は無い**） |
| `reverse-engineering-timestamp.md` | 新現在節（本 intent のメタデータ）。`260814-coverage-quick-norm` を履歴へ降格 |
| `re-scans/260814-failopen-error-paths.md` | 本ファイル（新規） |

**Reviewed-and-unchanged**（沈黙のスキップではなく、レビュー済みで無変更）: `business-overview.md` / `architecture.md` / `code-structure.md` / `technology-stack.md` / `dependencies.md`。理由 — 本 scan の新規事実は既存 2 ファイル（`amadeus-sensor.ts` / `amadeus-state.ts`）の**分岐の意味論**に関するもので、(a) モジュール配置・新規ファイルの変化ゼロ、(b) 依存エッジの追加削除ゼロ、(c) 技術スタック（bun / TypeScript / Biome）に変更なし、(d) 業務価値面の含意（blocking gate が壊れたスクリプトを通す）は品質評価節へ集約した。**この 5 面と、訂正注記のみを受けた `api-documentation.md` / `component-inventory.md` は本 intent の節を持たないため、後続ステージがここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。

## 中核知見（要約 — 全数は `code-quality-assessment.md` の当該節が正本）

1. **fail-open の全数**: `decideOutcome`（`amadeus-sensor.ts:612-735`）の 11 return site のうち 9 本が `passed`。うち `:588-593` は確定した `failed` を `passed` へ降格させる。
2. **機械的根本**: `Note`（`:866-869`）を判定のために読む消費者はゼロ。ゲートに届くのは監査イベント名 `SENSOR_PASSED` そのもの（`evaluateBlockingSensors` `amadeus-state.ts:1972` / `:1979` の裸等価）。
3. **最重要制約（Issue 本文に無い）**: dispatcher は severity-blind（`amadeus-sensor-fire.ts:208`）。severity は宣言 → compile 搬送 → ゲート消費の鎖にのみ存在し、実行側に無い。よって真理値表側の是正は新配管なしでは blocking 限定にできず、必然的に advisory の挙動も変える。
4. **回帰ピンの性格**: `t2771:151-163` はコメント逐語テキストのみの drift-detector。消費側のみ強化する修正では緑のまま通るため、回帰防御にならない。
5. **既存 drift**: コメント 7 arm 対 実装 11 return site（`external-sigterm` / `signal-<n>` / `detail-write-failed` がコメント表に無い）。#2988 と独立の既存債務だが、`:19-31` を触るなら同時に閉じられる。
6. **実害経路**: shipped blocking sensor は `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5`（本ワークスペースで活性）と fixture の 2 件のみ。前者があるため #2988 は仮説ではない。
7. **テストインフラは充足**: 生成側 seam（`t-sensor-fire-seam.test.ts`）/ 消費側 unit（`t511-blocking-sensor-severity.test.ts`）/ integration（`t511-blocking-sensor-gate.integration.test.ts`）/ fixture スクリプトが既存。落ちる実証に新規 fixture は不要。

## 適用範囲外（明示）

修正形状 A（真理値表変更）/ B（消費側強化）/ C（両方）/ D（dispatcher へ severity 配管）の選定、advisory への波及を許容するか否か、新 terminal イベントの導入可否、`amadeus-state.ts:2018-2022` の政策分界コメントの去就、コメント/実装 drift を同一変更で閉じるか否か、落ちる実証の置き場 — **裁定はいずれも requirements-analysis / application-design / build-and-test の所掌**であり、本 scan は選択肢と影響半径の提示に留める。
