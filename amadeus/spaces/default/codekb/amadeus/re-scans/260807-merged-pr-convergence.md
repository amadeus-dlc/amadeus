# re-scan record — 260807-merged-pr-convergence

本ファイルは intent `260807-merged-pr-convergence`（Focus: [Issue #2401](https://github.com/amadeus-dlc/amadeus/issues/2401) — マージ済み PR に対する pr-convergence の landed 表現）の Reverse Engineering における**全数列挙の正本**である。共有成果物の現在断面は本ファイルを要約したものであり、件数・file:line の疑義は本ファイルを参照して解決する。

**測定 ref: 全 file:line は observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= 本 worktree HEAD、`git rev-parse HEAD` 実測）断面**（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

## 実行メタデータ

- Date: `2026-08-07`
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（直前の現在断面 `260807-failclosed-recovery-path` の observed。`git merge-base --is-ancestor b8e3e664f HEAD` exit 0 を実測）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`
- 区間規模: **12 commits / 108 files changed（+5711 / −200）**。`amadeus/spaces` record を除く実質変更は **30 files**（`git diff --name-only b8e3e664f..HEAD | grep -v '^amadeus/spaces'`。Developer scan 申告の 29 とは集計フィルタ差 — ファイル列挙を正とする）
- Scan mode: DIFFERENTIAL refresh。xrev mode は主張しない（下記 § scan mode の位置づけ）
- Verification: 本 RE では新規テストを実行していない。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。検証は observed 断面での `git rev-parse` / `git merge-base --is-ancestor` / `git diff --name-only` / `sed -n` / `grep` / `ls` の実測と、患部の verbatim 直読による

### scan mode の位置づけ

`cid:reverse-engineering:c1-xrev-single-issue` が要求する「起票者以外2名の独立エビデンス付き verdict」は #2401 の GitHub コメント上で**成立していない** — クロスレビューコメント2件は独立実測 verdict の体裁（file:line・検証コマンド付き）を持つが、著者はいずれも起票者本人アカウント（j5ik2o）である（直前 intent 260807-failclosed-recovery-path と同一の判定理由）。したがって **xrev mode は主張しない。**

代替の接地: (a) verdict 2件を Developer scan の一次入力とし、(b) conductor / Developer の verbatim 直読で二重化し、(c) Architect synthesis（本ファイル）が主要引用を HEAD 断面で独立再確認した。

## base→observed 区間の全数

### コミット列（12 commits、`git log --oneline b8e3e664f..HEAD` 実出力の転記）

| SHA | 件名 | 分類 |
|---|---|---|
| `4a3da7d62` | chore(record): sync 260807-failclosed-recovery-path workflow record (completed) (#2404) | record |
| `0b63810b8` / `091f221f0` / `1b08bd943` / `f425f705c` / `65658e0cf` / `5c869bcb2` | chore(metrics) snapshot 系 (#2400/#2399/#2395/#2394/#2391/#2390) | metrics 自動 PR |
| `d98dd9039` | fix(engine): let a declared unit list settle the degrade per-unit gate (#2393) | engine fix（declare-units-done、t367/t480 改訂） |
| `9d238fd91` | fix(advisory): add a recovery verb for schema 1 advisory choice stores (#2392) | advisory fix（t470 新設） |
| `edfee5818` | fix(no-silent-drop): reconcile gate base and squash-orphaned evidence binding (#2389) | no-silent-drop fix |
| `75a1c198d` | chore(plugin): opt in pr-convergence for self-development (#2388) | **plugin opt-in（`amadeus/config.json:41` に `"pr-convergence"`）** |
| `28bc42353` | fix(no-silent-drop): canonicalize freshness paths and narrow the landing proof (#2387) | no-silent-drop fix（t413/t466） |

### 患部の不変性

**`plugins/pr-convergence/` 配下の区間内変更は 0 件**（`git diff --name-only b8e3e664f..HEAD -- plugins/pr-convergence/` = 0）。患部機構は前回 RE（260805-pr-convergence-plugin、observed `8409c2039`）で着地した形から observed まで不変であり、以下の機構マップは HEAD 断面の verbatim 再確認で currency を確定した（免除の主張ではなく区間実測 — `cid:reverse-engineering:E-XBB-RE-S13-c2` の形）。

## 患部機構マップ（HEAD `4a3da7d62` verbatim 確認済み）

### 収束述語 — `plugins/pr-convergence/tools/pr-convergence-predicate.ts`

- **`evaluateConvergence` `:180-192`** — "converged" の唯一の定義点。CLEAN 必要条件は `:181-185`:
  ```
  const converged =
    input.repliedUnresolved === 0 &&
    input.ignored === 0 &&
    input.state.mergeStateStatus === "CLEAN" &&
    input.resolution === "resolved";
  ```
  **MERGED PR は mergeStateStatus が CLEAN にならないため converged は恒久 false** — これが #2401 の機序。
- **`statusCheckRollup` の意図的不在 `:176-179`** — 設計コメント verbatim: `` `statusCheckRollup.state` is deliberately absent: it does not distinguish required from optional checks, so a green rollup would be a weaker claim than "the merge state is CLEAN". ``
- **`MergeStateStatus` union `:90-98`** — `"CLEAN" | "BEHIND" | "BLOCKED" | "DIRTY" | "DRAFT" | "HAS_HOOKS" | "UNSTABLE" | "UNKNOWN"` の8値。**MERGED は無い**。
- **未知値 throw `:117-121`** — `if (known === undefined) throw new Error(`unknown mergeStateStatus: ${JSON.stringify(raw)}`);`（fail-closed parse）。
- **`resolveMergeable` `:249-269`** — mergeable=UNKNOWN の retry ループ（`MERGEABLE_UNKNOWN_RETRY_MAX` = 5 回 × `MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS` = 10s）。resolved / unknown-exhausted / gh-failure の3出口。

### GraphQL 取得面 — `plugins/pr-convergence/tools/pr-convergence-gh-runner.ts`

- **`PR_STATE_QUERY` `:191-195`** — verbatim: `pullRequest(number:$number){ mergeable mergeStateStatus }`。**`state` / `merged` / `mergeCommit` は未取得** — landed 判定にはフィールド追加が要る。
- **`RawPrState` `:76-79`** — `{ readonly mergeable: string; readonly mergeStateStatus: string; }`。fail-closed parse（predicate 側の throw）を弱めない形での拡張が制約。

### CLI — `plugins/pr-convergence/tools/pr-convergence-cli.ts`

- **verb 閉集合 `:320`** — `if (verb !== "status" && verb !== "report" && verb !== "override")` → `expected status|report|override`。
- **`ConvergenceReport` kind union `:61-76`** — `kind: "converged"` と `kind: "override"` の2値判別 union。
- **`renderReport` `:89-129`** — レポート Markdown の唯一のレンダラ。
- **report 非収束 refuse `:438-447`** — `not converged — no report written. …` / exit 1。
- **override already-converged refuse `:468-474`** — `override refused: the pull request is already converged — use the report verb` / exit 1。
- **audit-before-report 順序（ヘッダコメント `:20-25`）** — verbatim: `the override path emits the audit record BEFORE writing the report. … "no advance without a record" — only holds this way round.`
- **landed は refuse 二者のどちらにも乗らない** — converged=false の MERGED PR は report が refuse し、override は人間の裁定記録を強いる。第3状態としての新分岐追加は既存2状態の assert と両立する（非破壊追加）。

### センサー — `packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts`

- **kind 閉集合 `:69`** — `} else if (kind !== "converged" && kind !== "override") {`。
- **kind×converged 整合分岐 `:122-130`** — override→converged:false by construction / converged→converged:true by construction の相互検査。
- **core→plugin import 禁止（ヘッダ `:16-20`）** — verbatim: `Deliberately does NOT import the plugin's renderReport. Core ships to every harness whether or not the plugin is installed … the shipped test renders its fixtures FROM renderReport so the two cannot drift unobserved.` drift 防止の実装は t450 の renderReport 由来 fixture。

### 配布投影

- **canonical は repo root `plugins/`** — `scripts/package.ts:86-87` `pluginsRoot()` = `process.env.AMADEUS_PLUGINS_ROOT ?? join(REPO_ROOT, "plugins")`。dist + opt-in 済み self-install 面へ投影され、`.claude/plugins` は未追跡生成物。
- **opt-in 状態** — `amadeus/config.json:41` に `"pr-convergence"`（#2388 で区間内着地）。names 配列は `["formal-model-check", "pr-convergence"]`。
- **core 側に `"pr-convergence-report"` ハードコード 0 件**（grep 実測）— 語彙の産地は plugin stage frontmatter + sensor manifest。

## テスト面一覧

pr-convergence 系はすべて in-process（spawn 盲点なし）:

| tNNN | ファイル | 対象 |
|---|---|---|
| t444 | `tests/unit/t444-stage-frontmatter-seams.test.ts` | seam parse/serialize |
| t445 | `tests/integration/t445-stage-frontmatter-compose.integration.test.ts` | compose 統合 |
| t446 | `tests/unit/t446-pr-convergence-predicate.test.ts` | 収束述語（MergeStateStatus parse / evaluateConvergence / resolveMergeable） |
| t447 | `tests/integration/t447-pr-convergence-ledger.integration.test.ts` | review-thread ledger |
| t448 | `tests/integration/t448-pr-convergence-cli.integration.test.ts` | CLI verb 3種の refuse/成功経路 |
| t449 | `tests/integration/t449-pr-convergence-packaging-e2e.integration.test.ts` | packaging E2E |
| t450 | `tests/integration/t450-pr-convergence-report-format-sensor.integration.test.ts` | sensor（fixture は renderReport から生成 — drift 防止の実体） |

- tNNN 予約: 区間内で t466 / t470 / t480 が着地。**使用済み最大 t480、新規は t481 以降**（`ls tests/unit tests/integration tests/smoke tests/e2e | grep -oE '^t[0-9]+'` 最大値実測）。
- coverage allowlist: pr-convergence の行ピンは `tests/.coverage-patch-allowlist.json:6365-6398`（`pr-convergence-cli.ts` ×2、`pr-convergence-gh-runner.ts`、`pr-convergence-ledger.ts` の4エントリ）。対象ファイルへ行挿入する変更は機械 remap + span 検査の規律該当（`cid:code-generation:c1-allowlist-mechanical-remap` / `cid:code-generation:cg-allowlist-straddle-swell`）。

## 実装上の注意（後続ステージへの申し送り 7 点）

1. **語彙追加は3面同時** — レポート kind の追加は (a) `ConvergenceReport` union（`cli.ts:61-76`）、(b) `renderReport`（`:89-129`）、(c) sensor の kind 閉集合＋整合分岐（sensor `:69` / `:122-130`）を同一変更で揃える。片面欠けは sensor FAILED または drift テスト赤として顕在化する。
2. **landed は第3状態として新分岐で追加** — report の非収束 refuse（`:438-447`）と override の already-converged refuse（`:468-474`）はどちらも landed を表現できず、既存テストは converged/override の2状態を pin している。新分岐の追加は既存 assert と両立する（既存分岐の意味変更は `cid:reverse-engineering:c1-pinned-behavior-ruling` により要件段の裁定事項）。
3. **fail-closed parse を弱めない GraphQL フィールド追加** — landed 判定は `PR_STATE_QUERY`（`gh-runner.ts:191-195`）への `state` / `merged` 等の追加で行い、`MergeStateStatus` union へ MERGED を足して throw（`predicate.ts:117-121`）を緩める形にしない（mergeStateStatus の語彙と PR state は別軸）。
4. **stage 文書「Convergence is not merge」との表面矛盾回避** — `plugins/pr-convergence/stages/pr-convergence.md:34-37` / `:200-202` は「収束はマージではない・マージは常に人間の判断」と宣言する。landed は「マージ後の事後確認状態」であり「収束の代替」ではない、という語彙整理を文書側で明示する。
5. **audit-before-report 順序の維持** — override 経路の「audit 先行」（`cli.ts:20-25` ヘッダ）は "no advance without a record" の成立条件。landed 経路が record を書く場合も同順序に従う。
6. **canonical は repo root `plugins/`** — 編集は `plugins/pr-convergence/` の正本のみ。`.claude/plugins` 等は未追跡生成物であり、投影は `bun run build`（`scripts/package.ts:86-87` の pluginsRoot 解決）。
7. **coverage 行ピンの remap** — `cli.ts` / `gh-runner.ts` / `ledger.ts` への行挿入は allowlist `:6365-6398` の4エントリを機械 remap し、reason と現行行内容の直読照合＋span 膨張検査を併用する。

## Developer scan との差分

- 区間の実質変更ファイル数: scan 申告 29 → Architect 実測 **30**（`grep -v '^amadeus/spaces'` フィルタ、`amadeus/config.json` を実質変更に含む）。ファイル列挙は本ファイル § 区間の全数を正とする。
- その他の file:line・verbatim 引用は全件 HEAD 断面で一致を確認した（訂正なし。CLI verb 閉集合は `:320` が判定行、`:318-322` が関数冒頭ブロック）。
