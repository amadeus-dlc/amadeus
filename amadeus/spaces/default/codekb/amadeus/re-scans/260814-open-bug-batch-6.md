# RE スキャン記録 — 260814-open-bug-batch-6

## 実行メタデータ

- Date: `2026-08-15`
- Base commit: `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780`（本 intent に先行スキャンは無いため、`re-scans/` 中で最も新しい **observed commit** を採る規則に従い `260814-park-provenance.md` の observed を base とした。祖先性の実測: `git merge-base --is-ancestor 1d08374cd7e4ef89637b4a8000bab3fcf1a0f780 a49f9e9fdbd19fd40e9374feba77e9360771d173` → **exit 0**）
- Observed commit: `a49f9e9fdbd19fd40e9374feba77e9360771d173`（`origin/main` 系譜のコミット、PR #3069 の着地。本 worktree HEAD = `git rev-parse HEAD` → `a49f9e9fdbd19fd40e9374feba77e9360771d173` で observed と同一）
- 差分規模: `git rev-list --count 1d08374cd..a49f9e9fd` → **24** コミット。`git diff --stat 1d08374cd..a49f9e9fd` の末尾行 → **570 files changed, 34878 insertions(+), 7339 deletions(-)**
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: オープンバグ5件 — [#3062](https://github.com/amadeus-dlc/amadeus/issues/3062) / [#3026](https://github.com/amadeus-dlc/amadeus/issues/3026) / [#3028](https://github.com/amadeus-dlc/amadeus/issues/3028) / [#3031](https://github.com/amadeus-dlc/amadeus/issues/3031) / [#3032](https://github.com/amadeus-dlc/amadeus/issues/3032)

## スキャンモード判定

**通常の差分リフレッシュ**（xrev differential scan mode 不採用）。

判定根拠(実測): 対象5 Issue のいずれにも**クロスレビュー verdict コメントが存在しない**。述語 `gh issue view <n> --json comments -q '.comments[]...'` を 3062 / 3026 / 3028 / 3031 / 3032 の各番号へ適用 → いずれも**出力0行**。xrev differential は「凍結された review 断面」を currency 判定の起点とするが、その断面自体が存在しないため currency 条件の判定以前に適用対象外となる。#3062 / #3026 / #3028 は `<!-- amadeus-finding:... -->` provenance を持つ intent-first のミラー Issue、#3031 / #3032 は Issue-first だがクロスレビュー未実施である。

なお `cid:reverse-engineering:c5-xrev-currency-schema-migration` が扱う「患部の表現形式を変える移行が挟まる」条件は本区間で**実際に成立**している（後述の plugin rename）。仮に verdict が存在したとしても currency は不成立だった。

## 1. base..observed の変化面（棚卸し）

### 1.1 領域別のファイル数

述語: `git diff --name-only 1d08374cd..a49f9e9fd` を第1〜2セグメントで集計（`awk` + `sort | uniq -c`）。主要行のみ転記。

| 領域 | ファイル数 |
| --- | --- |
| `amadeus/spaces/` (大半は `intents/` の工程記録) | 384 |
| `tests/integration/` | 65 |
| `tests/unit/` | 29 |
| `packages/framework/core/tools/` | 19 |
| `plugins/github-pr-convergence/` | 13 |
| `metrics/` | 9 |
| `plugins/formal-model-check/` | 7 |
| `docs/reference/` | 6 |
| `plugins/git-drift/` | 4 |
| 各ハーネス表層 `packages/framework/harness/<name>/` | 各 1（8 ハーネス） |

### 1.2 構造変化 4 点（本スキャンで最も重い）

**(a) プラグインの rename — `pr-convergence` → `github-pr-convergence`（PR #3051、コミット `a4196f191`）**

`git diff --name-status 1d08374cd..a49f9e9fd -- plugins/` の実測で、13 ファイルが `R080`〜`R100` の rename として記録されている。ツール本体 9 件はすべて **`R100`（内容バイト完全一致）**であり、**行番号は不変**。変わったのは配置パスと `plugin.json` の `name` フィールドのみ。

| 旧パス | 新パス | 類似度 |
| --- | --- | --- |
| `plugins/pr-convergence/plugin.json` | `plugins/github-pr-convergence/plugin.json` | R096 |
| `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md` | `plugins/github-pr-convergence/sensors/…` | R080 |
| `plugins/pr-convergence/stages/pr-convergence.md` | `plugins/github-pr-convergence/stages/…` | R097 |
| `plugins/pr-convergence/tools/pr-convergence-cli.ts` ほかツール 8 件 | `plugins/github-pr-convergence/tools/…` | R100 |

**stage slug は `pr-convergence` のまま**であり（`plugins/github-pr-convergence/plugin.json` の `stages[0].slug`）、変わったのはプラグイン名のみ。`amadeus/config.json` も同一区間で `plugin.activation.names` と `scope-bindings` のキーを `pr-convergence` → `github-pr-convergence` へ追随させている。

**この rename は本 intent の Focus に直接影響する**: Issue #3062 が引用する `pr-convergence-cli.ts:1364-1366` はパスが移動しており、現行断面での正しい引用は `plugins/github-pr-convergence/tools/pr-convergence-cli.ts:1364-1366` である（内容 R100 のため行番号自体は有効）。

**(b) 新規プラグイン `git-drift`（PR #3055、コミット `2fbc07406`）**

4 ファイル新設（`plugin.json` / `sensors/amadeus-git-drift.md` / ツール 2 件）。`plugin.json` は `sensors` キーで自センサーを宣言し、`seams` で `code-generation` と `build-and-test` の `sensors` シームへ `git-drift` を注入する。**これによりセンサーの実在集合が 13 → 14 件、投影集合が 12 → 13 件へ増えた**（#3026 / #3028 の分母が動いている）。

**(c) `plugin.settings` 機構の新設（PR #3052、コミット `05da1758c`）**

`packages/framework/core/tools/amadeus-plugin-settings.ts`（+274 行）が新設され、`amadeus-plugin-compose.ts` / `amadeus-plugin-runtime.ts` / `amadeus-config.ts` が追随。宣言・階層化オーバーライド・fail-closed 解決を提供する。`git-drift` の `fetch-throttle-seconds` が最初の利用者。

**(d) 選挙 v2 への移行（PR #3036、コミット `7711246fd`）**

`packages/framework/core/tools/` の変更 19 件のうち中核は選挙系: `amadeus-election-codec.ts`(+908 新設) / `amadeus-election-question-tally.ts`(+386 新設) / `amadeus-election-transport.ts`(+94 新設) / `amadeus-election-store.ts`(±1489) / `amadeus-election.ts`(±1507) / `amadeus-election-record.ts`(±883) / `amadeus-election-model.ts`(-536 縮退)。`scripts/amadeus-election-migrate.ts` は **削除**（`D`）。TLA 仕様側も `FormalElection.tla` / `FormalElectionCore.tla` / `FormalElection.cfg` / `model-map.json` が同期。テスト面では `t547`〜`t559` が新設され、旧 `t234` / `t238` / `t262` / `t416` が削除された。

本 intent の Focus 5 件はいずれも選挙系に非接触であり、この移行は**背景の変化面**として記録するに留める。

### 1.3 Focus 患部ファイルの base..observed 変化有無

述語: `git diff --stat 1d08374cd..a49f9e9fd -- <paths>`。出力に現れないパスは無変更。

| 患部 | 変化 |
| --- | --- |
| `plugins/…/pr-convergence-cli.ts` | 内容不変（rename のみ、R100） |
| `plugins/…/amadeus-sensor-pr-convergence-report-format.ts` | 内容不変（rename のみ、R100） |
| `plugins/formal-model-check/plugin.json` | **無変更** |
| `docs/harness-engineering/06-sensors.md` / `.ja.md` | 各 **1 行**変更（rename 追随のみ、表の行数は不変） |
| `tests/integration/t-worktree-gc.test.ts` | **+13 / -1 変更あり**（後述 §2.4） |
| `packages/framework/core/tools/amadeus-lib.ts` | +19 / -6 変更あり（ただし park の presence 分類のみ、emit 経路は不変。後述 §2.5） |
| `packages/framework/core/otel/bootstrap.ts` | **無変更** |
| `packages/framework/core/otel/audit-emit.ts` | **無変更** |
| `tests/unit/t214-engine-error-logged-seam.test.ts` | **無変更** |
| `tests/integration/t214-engine-error-logged.test.ts` | **無変更** |

## 2. Focus 5 領域の実測所見

### 2.1 #3062 — merge queue 着地後に self record の収束 report を最終化できない

**主張は observed 断面で成立する（パス引用のみ要訂正）。**

拒否ガードの実読（`plugins/github-pr-convergence/tools/pr-convergence-cli.ts:1364-1366`、逐語）:

```ts
  if (isSelfRecord(options.record) && evaluation.value.kind === "landed") {
    return { exitCode: 1, stdout: "", stderr: "landed is not convergence evidence\n" };
  }
```

このガードは `runConvergence`(`:1353`) の入口、`options.verb` 分岐（`status` は `:1381`）より**前**に位置するため、`report` / `override` を含む全 verb が self record では landed 時点で到達不能になる。Issue の「override 分岐へ到達する前の :1364 ガードで拒否」は構造として正しい。

同一メッセージの拒否は **3 箇所**に存在する（述語 `grep -n "landed" plugins/github-pr-convergence/tools/pr-convergence-cli.ts`、`landed is not convergence evidence` の一致行）:

| 行 | 所属関数 | 位置づけ |
| --- | --- | --- |
| `:823` | `writeSelfReport`(`:815`) | 書込層の拒否 |
| `:1260` | `reportOutcome`(`:1253`) | report 生成層の拒否 |
| `:1364` | `runConvergence`(`:1353`) | CLI 入口の拒否（Issue が引く点） |

**是正時は3層すべてが射程**であり、`:1364` のみを緩めても `:1260` / `:823` で再度落ちる。Issue の受け入れ条件は `:1364` しか名指していないため、この3層構造は本スキャンの追加所見として引き継ぐ。

センサー側（`plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`）の実読で、Issue の記述より**制約が強い**ことが判明した:

- `:368-372` — `kind === "landed"` は **stage を問わず無条件**に finding を積む（逐語 `findings.push({ field: "kind", reason: "landed is a merge fact, not convergence evidence" })`）
- `:378-380` — `kind === "created"` の拒否のみが `stage === "pr-convergence"` 条件付き（逐語 reason `"created proves PR delivery only; final convergence requires converged or override"`）

つまり `landed` は pr-convergence ステージ外でもセンサーを通らない。Issue の「センサーは pr-convergence ステージで converged/override を要求」は `created` については正確だが、`landed` については stage 非依存であり、より広い。

predicate 側は Issue の主張どおり landed を第一級 verdict として持つ（`pr-convergence-predicate.ts:262` の `verdict: "converged" | "not-converged" | "landed"`、`:281` `landedVerdict` は `converged: false` を意図的に返す）。CLI・センサーが拒否する一方 predicate は landed を表現できる、という非対称は現行断面でも保たれている。

### 2.2 #3026 — `amadeus-model-completeness.md` が plugin.json 未宣言で投影欠落

**主張は observed 断面で成立する。分母のみ更新が必要。**

- 資産の実在: `ls plugins/formal-model-check/sensors/` → `amadeus-model-completeness.md`（1件）
- 宣言の不在: `plugins/formal-model-check/plugin.json` を全文実読。トップレベルキーは `name` / `stages` / `seams` / `fragments` / `tools` / `advisories` の 6 つで、**`sensors` キーは存在しない**
- 対照（宣言している側）: `plugins/github-pr-convergence/plugin.json` と `plugins/git-drift/plugin.json` はいずれも `"sensors": ["sensors/amadeus-….md"]` を持つ
- 投影の実測: `ls -1 .claude/sensors/*.md | wc -l` → **13**。内訳は core 11 + `amadeus-pr-convergence-report-format.md` + `amadeus-git-drift.md`。**`amadeus-model-completeness.md` は投影に含まれない**（`ls -1 .claude/sensors/` の全 13 行を実読して確認）

Issue が記した「投影 12 → 13 になることを実測」という受け入れ条件は、**base..observed で `git-drift` が 1 件足したため既に 13 に達している**。是正後の期待値は **13 → 14** へ読み替える必要がある。

投影機構の実測（`packages/framework/core/tools/amadeus-plugin-compose.ts`）: `parseSensors` が `raw.sensors` を読み（`:361`）、宣言されたパスのみが `ownedPaths`(`:956`) と投影対象(`:992` / `:1023`)へ入る。`sensors` キー欠落時は `m.sensors ?? []` のフォールバック（`:554` / `:956` / `:992` / `:1023`）で空配列となり、**エラーにも警告にもならない**。Issue の「欠落は無音」という主張は、この4箇所の `?? []` が機構的根拠である。

### 2.3 #3028 — 06-sensors のセンサー表が実在集合から drift

**主張は observed 断面で成立し、かつ drift は拡大している。**

- 表の行数: `grep -c '^| \`amadeus-' docs/harness-engineering/06-sensors.md` → **10**、`.ja.md` も **10**（en/ja 同数、Issue の記述どおり）
- 実在センサー: `ls packages/framework/core/sensors/*.md | wc -l` → **11**、`ls plugins/*/sensors/*.md | wc -l` → **3**、計 **14**（Issue 起票時は 13。`git-drift` の 1 件増）
- 表に無いセンサー **4 件**（Issue 起票時は 3 件）。述語 `grep -c "<name>" docs/harness-engineering/06-sensors.md` を各名へ適用、**すべて 0 hit**:
  - `amadeus-nfr-budget` → 0
  - `amadeus-question-budget` → 0
  - `amadeus-scope-sizing` → 0
  - `amadeus-git-drift` → 0（**新規に増えた欠落**）
- 表にあるが投影されない 1 件: `amadeus-model-completeness.md`（`:70`。#3026 の帰結）

base..observed での 06-sensors への唯一の変更は、`amadeus-pr-convergence-report-format.md` 行の説明文中 `pr-convergence` を `github-pr-convergence` へ書き換えた **1 行のみ**（`git diff` 実読）。rename には追随したが、同区間で追加された `git-drift` センサーの行追加は行われておらず、**固定表が件数変化に追随しない構造がそのまま再現した**。Issue の「件数フリー契約でない固定表が欠落を隠している」という主張は、本区間の実例で追加的に裏付けられた。

### 2.4 #3031 — t-worktree-gc「--base overrides the merge target」の transient 赤

**主張の患部は現存するが、base..observed で部分的な緩和が既に着地している。未閉包。**

テストは現存し、行番号が drift している。Issue は `:160-175` を引くが、observed 断面では **`:172-188`**（`test("--base overrides the merge target", …)` は `:172`）。Issue が失敗点として名指す `git worktree add -q --detach <dir> feature/current` は **`:180`**（Issue の `:169` から drift）。

**base..observed で `git` ヘルパ（`:14-27`）に retry が追加された**（コミット `e44f6e3c2` = PR #3056、`git log -S"for writing: No such file or directory" -- tests/integration/t-worktree-gc.test.ts` で一意に特定。`git rev-list 1d08374cd..a49f9e9fd | grep -c <sha>` → **1** で本区間内と確認）。追加分は逐語:

```ts
  if (
    result.exitCode !== 0 &&
    args[0] === "worktree" &&
    args[1] === "add" &&
    stderr.includes("/locked' for writing: No such file or directory")
  ) {
    // `git worktree add` removes its incomplete metadata on exit, so retry the
    // narrow prune race once without masking any other fixture setup failure.
    result = Bun.spawnSync({ cmd: ["git", ...args], cwd, stderr: "pipe", stdout: "pipe" });
  }
```

**この緩和は #3031 が観測した失敗を覆わない可能性が高い（実測に基づく所見）**:

1. retry の発火条件は stderr が `/locked' for writing: No such file or directory` を**含むこと**に限定される
2. 一方 Issue #3031 は「exit 128 の stderr 本文はログに残っていない（attempt 1 ログの該当行は空)」と記録しており、観測された失敗の stderr は**未特定**である
3. したがって観測失敗が上記文字列を含んでいたかは不明であり、含まなければ retry は発火しない

また Issue の受け入れ条件 1（「再発時に exit 128 の本文が assert メッセージへ確実に載ること」）は**未達のまま**である。`expect(result.exitCode, result.stderr.toString()).toBe(0)`(`:26`) は retry 後は **2回目の実行の stderr** を載せるため、1回目の失敗本文はむしろ失われる方向に動いた。

並行実行 tier の実測は本スキャンでは確定できなかった。`tests/run-tests.ts` への述語 `grep -n "\-P 4\|concurrency\|maxParallel"` は 0 hit、`grep -n "integration"` で得られたのは `:1116` のコメント行 `// so the plain runTier path applies: parallel like unit/integration/e2e` のみで、並列度の数値定義には到達していない。Issue が仮説として挙げる「integration tier は 4 並列」は本スキャンでは**未検証**として引き継ぐ。

### 2.5 #3032 — t214-seam 由来 ERROR_LOGGED の実 record 着地

**着地2行は observed 断面で現存する。機序は依然として未実証。**

着地行の実測（述語 `grep -rn "seam: something went wrong\|seam: no state" amadeus/spaces/default/intents/` → **2 行、exit 0**）。いずれも `amadeus/spaces/default/intents/260807-projectdir-worktree-fix/audit/j5ik2o-mac-studio-lan-d13e4f0ca2c0.jsonl` の **`:155` と `:156`**、`timestamp` は 2 行とも `2026-08-07T11:20:09Z`、`intentId` は `260807-projectdir-worktree-fix`、`attributes.Tool` は `amadeus-orchestrate`、`attributes.Command` は空文字列。Issue の記述と完全に一致する。

文字列リテラルの帰属（述語 `grep -rn "seam: something went wrong" --include='*.ts'`、`node_modules` と `dist/` を除外）→ `tests/unit/t214-engine-error-logged-seam.test.ts:131`（`recordEngineError("seam: something went wrong")` の呼出行）と `:136`（アサーション行）の 2 hit のみ。`seam: no state` は同ファイル **`:158`**（`expect(() => recordEngineError("seam: no state")).not.toThrow()`）。Issue が記す `:131` / `:158` は observed 断面でも**一意に有効**（当該テストファイルは base..observed で無変更）。

emit 宛先経路を実読した結果、Issue の仮説を支持も反証もする新事実は得られなかったが、経路の各段は現存を確認した:

- `packages/framework/core/tools/amadeus-lib.ts:8066` `emitErrorAuditRow` → 同 `:8075` で `otel.emitAuditEvent("ERROR_LOGGED", …, projectDir, intent, space)` を呼ぶ（`require` による遅延 import。同ファイル `:8061-8065` のコメントが lib↔otel の循環を破るためと明記）
- `packages/framework/core/otel/audit-emit.ts:48` `emitAuditEvent` → `:55` で `ensureOtelBootstrap(projectDir)`
- `packages/framework/core/otel/bootstrap.ts:88` `ensureOtelBootstrap` → `:90-91` で `assertSameProject(registeredFor, projectDir, "logs")` / `assertSameProject(logsSideEffectsFor, projectDir, "logs")`
- `assertSameProject`(`:45-53`) は不一致時に `throw new Error("OTel ... already bootstrapped for project dir ... — invariant violation (one workspace per process)")`
- 呼び元 `emitError`(`amadeus-lib.ts:8087`) は `try { … } catch { }`(`:8102-8105`) で**すべての例外を握り潰す**（逐語コメント `// Audit write failed — we're already in an error path, swallow.`）

**この経路構造が示すこと**: `assertSameProject` が throw する場合、`emitError` の catch が握り潰すので**行は書かれない**。したがって「先にピンされた別 workspace へ着地する」には、`assertSameProject` を**通過した**うえで書込先が fixture でなく実 record になる別の機序が要る。Issue の仮説（OTel per-process ピン）を現行バイトで成立させるには、`registeredFor` が実 record に固定されたまま `projectDir` も実 record として渡る経路、すなわち**呼出時点の `projectDir` 解決自体が実 record を返している**必要がある。Issue が「`resolveProjectDir` 単体では説明できない」とする点と整合しない可能性があり、**当時断面（2026-08-07）のバイトでの再現が機序特定の必須条件**である。現行断面のみからは確定できない。

なお `otel/bootstrap.ts` と `otel/audit-emit.ts` は base..observed で**無変更**、`amadeus-lib.ts` の +19/-6 は `PresenceEvent` への `res: "park"` 追加と `WORKFLOW_PARKED` の分類追加（`scanPresenceLedger` 内、#3016 の park provenance 対応）のみで、**emit 経路には非接触**。よって #3032 の機序は本区間で動いていない。

## 3. 実測規律に関する注記

- 本記録の件数はすべて集計コマンド出力からの転記であり、測定 ref は `a49f9e9fdbd19fd40e9374feba77e9360771d173`（本 worktree HEAD と同一）。
- 不在主張（`sensors` キーの不在、docs 表への 4 センサーの不在、クロスレビューコメントの不在）はいずれも grep / CLI の**出力と exit code の両方**を確認して確定した。`\b`（語境界）を含む述語および長い選言は `cid:reverse-engineering:c6-absence-predicate-exit-code` / `c6-ugrep-word-boundary` に従い使用していない。
- `plugins/formal-model-check/plugin.json` の `sensors` 不在は grep ではなく**全文実読**で確定した（キー数が少なく全域を目視できるため、述語の健全性に依存しない形を選んだ）。

## 4. 未解決点・引き継ぎ

1. **#3062 の是正射程**: `landed` 拒否は CLI の3層（`:823` / `:1260` / `:1364`)に存在し、センサー側の `landed` 拒否は stage 非依存。Issue の受け入れ条件は `:1364` とステージ条件付き拒否のみを前提としており、設計時に射程の再定義が要る。
2. **#3026 / #3028 の分母更新**: `git-drift` の着地により、投影件数の期待値は 12→13 ではなく **13→14**、docs 表の欠落は 3 件ではなく **4 件**。Issue 本文の数値は起票時点の値であり、実装時は observed 断面の数値を使う。
3. **#3031 の帰属**: PR #3056 の retry が既に着地しているため、「未修正のバグ」ではなく「部分緩和済み・観測失敗を覆うか不明」が現行状態。再発時の stderr 捕捉（受け入れ条件 1）はむしろ retry によって後退した可能性がある。並列度の実測値は未取得。
4. **#3032 の再現可能性**: 現行断面の経路読解では、`assertSameProject` の throw を `emitError` の catch が握り潰す構造上、仮説どおりの「別 workspace への無音着地」は成立しにくい。当時断面での再現が要る。再現しない場合は Issue の完了条件 3（実測ログを添えたクローズと既着地2行の扱いの申し送り）が適用経路となる。
5. **codekb 本文の rename 追随**: 本スキャン以前の codekb 各節は `plugins/pr-convergence/…` のパスで file:line を引いている。それらは各節が宣言する observed commit 時点の値として保存し（`cid:reverse-engineering:c1`）、本 intent の節のみ新パスで記述した。
