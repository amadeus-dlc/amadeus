# re-scan: 260811-allowlist-semantic-audit（Issue #1622）

**Date**: `2026-08-11`
**測定 ref (observed)**: `854692fd7a11b124236b0427fe3d59e2fe6bf785`（= 本 worktree HEAD。`git rev-parse HEAD` の実出力。`cid:reverse-engineering:measurement-ref-in-artifacts`）
**Base**: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（直前 intent `260810-test-time-factor` の observed。`git merge-base --is-ancestor ce3c3ccfdb3f93e619a081386a70c8185b84f1db 854692fd7a11b124236b0427fe3d59e2fe6bf785` = **exit 0**、`git rev-list --count ce3c3ccfd..854692fd7` = **34 commits**。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: Brownfield、単一 repo `amadeus`、build `bun`
**Focus**: [Issue #1622](https://github.com/amadeus-dlc/amadeus/issues/1622)（`enhancement` / `P1` / `in-progress`）— `tests/.coverage-patch-allowlist.json` の全エントリを `reason` と現行行内容で直読照合し、無音転位を棚卸しする
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみ。実行した repo 操作は read-only（`git rev-parse` / `log` / `show` / `diff` / `rev-list` / `merge-base` / `grep` / `jq` / `sed` / `awk`）と、repo 外 scratch に置いた bun スクリプトからのソース読取のみ

---

## 1. Scan mode の選定根拠 — xrev differential scan を**採らなかった**

Issue #1622 にはクロスレビュー verdict が 2 件存在する（いずれも `2026-07-28T13:16:59Z` / `13:17:01Z`、CONFIRMED）。しかし本 scan は `cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue` の xrev モード（レビュー verdict を Developer scan の一次入力にする）を**採らない**。理由は次の実測による。

**(a) レビュー verdict の file:line が現行実装に対応しない。** verdict #1 は逐語で `tests/coverage-patch-gate.ts:125-151`（型と reason 非空の検査）、`:154-170`（stale 判定）、`:266-277`（0 行一致の fail）を引く。observed の同ファイルでは（`grep -n "^export "` および該当関数の実読）:

| verdict の引用 | verdict が説明する機構 | observed での実所在 |
|---|---|---|
| `:125-151` | 型検査・`reason` 非空 | `parseAllowlist` = `:360`（`export function parseAllowlist(json: string): AllowlistEntry[] {`） |
| `:154-170` | stale 判定 | `findStaleAllowlistEntries` = `:407-419` |
| `:266-277` | 0 行一致の fail | `runCheck` の stale 分岐 = `:556` 近傍 |

**(b) レビュー verdict の件数が現行台帳と一致しない。** verdict #1 は逐語で「allowlist は本文の約272件ではなく、`node` で `tests/.coverage-patch-allowlist.json` を数えると **300件**です」と述べる。observed では **623**（`jq 'length' tests/.coverage-patch-allowlist.json`）。

**(c) 機序: レビュー後に台帳のスキーマ自体が置換された。** Issue コメント（`2026-08-03T08:26:23Z`）が記すとおり PR #2127 が台帳を「絶対行番号ピン → 関数スコープ + ソース指紋の意味的セレクタ」へ移行しており、レビュー時点の検証対象データは observed に存在しない（旧形式 `lines` キーを持つエントリは observed で **0 件** — 下記 P1）。

したがって `cid:reverse-engineering:E-XBB-RE-S13-c2` が定める免除条件（`review..observed` の実 diff と被引用パス集合の交わりが空）は成立せず、かつ verdict 自体が一次入力として使えない。本 scan は **台帳の全数機械解決を一次証拠とする差分リフレッシュ**として実施した。

> **注（事実、裁定ではない）**: verdict #1 / #2 の中心主張（「機械ゲートが green でも意味論的腐敗を除けない」）は observed でも成立する（P2 参照）。失効しているのは引用の座標と件数であって、主張ではない。

---

## 2. 述語一覧（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review` の E-ASD-RES13 追補に従い、パターン・対象ディレクトリ集合・除外条件を結果と同じ場所に置く。すべて worktree ルートで実行。台帳の略記 `<L>` = `tests/.coverage-patch-allowlist.json`。

| ID | 述語（逐語） | 結果 |
|---|---|---|
| P0 | `git merge-base --is-ancestor ce3c3ccfdb3f93e619a081386a70c8185b84f1db 854692fd7a11b124236b0427fe3d59e2fe6bf785` | **exit 0**（祖先性 OK） |
| P0b | `git rev-list --count ce3c3ccfdb3f93e619a081386a70c8185b84f1db..854692fd7a11b124236b0427fe3d59e2fe6bf785` | **34** |
| P1a | `jq 'length' <L>` | **623** |
| P1b | `jq -r '[.[].file] \| unique \| length' <L>` | **106** |
| P1c | `jq -r '[.[] \| keys] \| add \| unique' <L>` | `["expiry","file","reason","selector"]` |
| P1d | `jq -r '[.[] \| select(.selector) \| .selector \| keys] \| add \| unique' <L>` | `["anchorLines","fingerprint","function","targetLines"]` |
| P1e | `jq '[.[] \| select(.selector == null)] \| length' <L>` | **0**（旧形式の絶対行ピンは残存ゼロ） |
| P1f | `git show ce3c3ccfdb3f93e619a081386a70c8185b84f1db:tests/.coverage-patch-allowlist.json \| jq 'length'` | **614**（base 断面） |
| P1g | `jq -r '[.[].reason] \| unique \| length' <L>` | **310**（distinct `reason` 文字列） |
| P1h | `jq '[.[] \| select(.expiry)] \| length' <L>` | **597** |
| P1i | `jq '[.[] \| select(.selector.function=="<module>")] \| length' <L>` | **90** |
| P1j | `jq '[.[]\|select(.selector.anchorLines==1)]\|length' <L>` | **233**（単一行アンカー = 全体の 37%） |
| P2a | `grep -n "^export " tests/coverage-patch-gate.ts` | **16 シンボル**。`reason` を引数に取る関数は **0 件** |
| P2b | `git grep -n "reason" -- tests/unit/t229-coverage-patch-gate.test.ts tests/integration/t229-coverage-patch-gate-check.test.ts` | 全 hit がフィクスチャ値生成か「非空」検査。`reason` の**内容**を検査するテストは 0 件 |
| P2c | `git grep -nIE "semanticAudit\|reasonMatches\|auditAllowlistReasons" -- 'packages/**' 'scripts/**' 'tests/**' '.github/**' 'plugins/**' 'docs/**'` | **exit 1**（0 hit） |
| P2d | `git grep -nIiE "allowlist.{0,60}(reason\|semantic).{0,60}(audit\|consistency\|mismatch)" -- 同上` | **exit 1**（0 hit） |
| P3 | `bun <scratch>/resolve-all.ts <worktree-abs>`（台帳の全セレクタを `resolveSemanticSelector` で解決し解決先の実行内容を dump） | stderr 逐語 `entries=623 resolveFailures=0`。**解決失敗 0 件** |
| P3b | 上記出力の md5 を Developer scan の `resolved.json` と比較 | 両者 `c4a98c8d1747b9ae2220e231ccf5478d` で**バイト一致**（決定的・再現可能） |
| P4 | `bun <scratch>/mismatch-survey.ts` | stderr 逐語 `total=623 withNamedIdentifier=125 noIdentifierHit=51` |
| P5a | `jq '[.[]\|select(.reason\|test("\\bt[0-9]{2,3}\\b"))]\|length' <L>` | **419**（テスト ID を引用） |
| P5b | `jq '[.[]\|select(.reason\|test("spawn";"i"))]\|length' <L>` | **260** |
| P5c | `jq '[.[]\|select(.reason\|test("type-only\|multiline (TypeScript )?(input )?type\|runtime-erased";"i"))]\|length' <L>` | **76** |
| P5d | `jq '[.[]\|select(.reason\|test("catch";"i"))]\|length' <L>` | **32** |
| P5e | `jq '[.[]\|select(.reason\|test("dispatch case\|usage message\|usage-error";"i"))]\|length' <L>` | **10** |
| P5f | `jq '[.[]\|select(.reason\|test("defensive, type-only, or spawned-boundary path"))]\|length' <L>` | **20**（後述の選言型 boilerplate） |
| P5g | `jq '[.[]\|select(.reason\|test("Residual defensive, invalid-input, replay, or process-boundary"))]\|length' <L>` | **25**（同上、別文面） |
| P6a | `git diff --name-only ce3c3ccfd 854692fd7 -- tests/coverage-patch-gate.ts tests/.coverage-patch-allowlist.json tests/unit/t229-coverage-patch-gate.test.ts tests/integration/t229-coverage-patch-gate-check.test.ts` | **`tests/.coverage-patch-allowlist.json` のみ**（ゲート実装とテストは区間内無変更） |
| P6b | `git diff --stat ce3c3ccfd 854692fd7 -- tests/.coverage-patch-allowlist.json` | `1 file changed, 109 insertions(+), 10 deletions(-)` |
| P6c | `git diff --name-only ce3c3ccfd 854692fd7 --` + 被引用 11 ソースパス | **`amadeus-graph.ts` と `amadeus-orchestrate.ts` の 2 件のみ**（他 9 パスは区間内無変更） |
| P7 | `jq '[.[] \| select(.reason\|test("findActiveStandingGrant"))] \| length' <L>` | **0**（Issue コメント既報の 4 エントリは observed の台帳に不在） |

### P2c の訂正（Developer scan の誤り）

Developer scan は「述語1」として 5 つの選択肢を `|` で連ねた 1 本の `grep -rniE` を実行し「**0 hit（出力なし）**」と記録している。同じ述語を observed で再実行すると、ローカルの `grep`（ugrep ラッパ）が

```
ugrep: error: error at position 247 ... exceeds complexity limits
```

を返して **exit 1 で異常終了**する。すなわち scan の「出力なし」は 0 hit ではなく**エラーの空出力**であり、0 hit の根拠にならない。本 scan は述語を P2c / P2d の 2 本へ分割し、`git grep` で再実測して 0 hit を確定した（結論自体は変わらない）。`cid:reverse-engineering:c4-control-byte-drafting` が記す「grep 系ラッパの無音脱落」と同族の落とし穴である。

---

## 3. 台帳と消費者の現況（事実）

### 3.1 スキーマ

`tests/.coverage-patch-allowlist.json` は JSON 配列。エントリのキー和集合は `expiry` / `file` / `reason` / `selector` の 4 つ（P1c）、`selector` のキー和集合は `anchorLines` / `fingerprint` / `function` / `targetLines`（P1d）。

| フィールド | 意味（実装根拠、observed で実読） |
|---|---|
| `file` | repo-relative なソースパス |
| `selector.function` | TypeScript AST の関数スコープ名。トップレベルは `<module>`（`tests/coverage-patch-gate.ts:190` 逐語 `const scopes: FunctionScope[] = [{ name: "<module>", start: 1, end: source.split(/\r?\n/).length }];`） |
| `selector.fingerprint` | **アンカー行群**の sha256。`sourceFingerprint`（`:181-183` 逐語 `return ` + テンプレート `sha256:` + `createHash("sha256").update(lines.join("\n")).digest("hex")`）。指紋対象は target 行ではなく target を含む一意化窓 |
| `selector.anchorLines` | アンカー窓の行数 |
| `selector.targetLines` | アンカー窓**内の相対**行範囲。`:312` 逐語 `return { start: matches[0] + relative.start - 1, end: matches[0] + relative.end - 1 };` |
| `reason` | 非空必須。**内容の正しさは一切検査されない**（P2a / P2b / P2c / P2d） |
| `expiry` | 任意。string であることのみ検査 |

### 3.2 消費者

台帳を解釈する実装は `tests/coverage-patch-gate.ts` の **1 箇所のみ**。CI 配線は `.github/workflows/ci.yml` の `Patch coverage gate` ステップ（`bun tests/coverage-patch-gate.ts --check`、PR イベント時のみ）。

### 3.3 解決は fail-closed、意味は fail-open — 非対称の所在

**解決経路（fail-closed、observed 実読）**: `resolveSemanticSelector`（`:288-313`）は 2 箇所で throw する。関数スコープ名が一意でないとき（`:294-298`、逐語メッセージ `coverage-patch-gate: function ${selector.function} in ${file} resolved ${scopes.length} times (expected exactly one)`）と、指紋の一致が一意でないとき（`:306-310`、逐語 `coverage-patch-gate: source fingerprint for ${file}#${selector.function} resolved ${matches.length} times (expected exactly one)`）。ソース不在も throw（`:391`）。`runCheck` はこれを捕まえて exit 1（`:552` 逐語 `console.error(...)` + `return 1`）。

**意味の担保（不在）**: `findStaleAllowlistEntries`（`:407-419`、全文実読）は引数が `entries` と `lcov` のみで `reason` を受け取らない。判定は `hits.has(line)`（DA レコードの**存在**）であり、ヒット数も見ない。範囲内に測定可能行が 1 行でもあれば「stale ではない」を返す。

**免除の適用段**: `evaluatePatch`（`:438-461`）は「diff 追加行 × LCOV に DA 実在 × `h > 0` でない」まで絞ったうえで `allowlisted(...)` を呼ぶ。`allowlisted`（`:421-426`）は解決済み範囲への**行番号の包含**のみを見る。すなわち免除の正当性判定はパイプラインのどの段にも存在しない。

> Issue #1622 の中心主張「範囲が測定可能行に一致するかの存在検査のみで意味一致を見ない fail-open」は、observed の実コードで**裏付けられる**（訂正なし）。

---

## 4. 確定転位 — **18 件**

判定基準: (i) セレクタの解決先を `resolveSemanticSelector` で機械解決し、(ii) 解決先の行内容を observed で verbatim 実読し、(iii) `reason` が名指しする機構の**真の所在**を独立に grep / 実読で特定し、(iv) (ii) と (iii) が別の実行単位（別関数・別分岐・別構文クラス）であることを確認した場合に「転位」と判定する。

| # | 解決先（observed） | 解決先の実内容（逐語） | `reason` が説明する対象 | 対象の真の所在（実測） |
|---|---|---|---|---|
| T1 | `packages/framework/core/tools/amadeus-election.ts:417` fn=`handleOpen` | `  if (!created.ok) return storeFail("create", created.error);` | views ディレクトリ `mkdirSync` の防御 catch | `:421-425`（`try` / `mkdirSync` / `catch` / `return fail("open: views directory could not be created");`） |
| T2 | `amadeus-state.ts:916` fn=`runSelectedIntentOperation` | `  operation: SelectedIntentOperation,` | Phase 2 telemetry wiring（`initProcessObservability` entry） | `:936-942` `observeToolRun`（`:938` に `initProcessObservability(...)`） |
| T3 | `amadeus-state.ts:925-940` fn=`<module>` | `const resolvedIntent = resolveSelectedIntent(pd, intent, space);` ほか（関数境界を跨ぎコメント行 `:933-935` を含む） | `enforceCallerAuthorization` が spawned CLI main でのみ走る | `:951` 定義 / `:989` 呼び出し |
| T4 | `amadeus-state.ts:961-964` fn=`enforceCallerAuthorization` | `  if (` / `    subcommand === undefined \|\|` / `    subcommand === "get" \|\|` / `    subcommand === "count" \|\|` | `main()` の `set-construction-iteration` dispatch case | `:1011-1012`（`case "set-construction-iteration":` / `handleSetConstructionIteration(args.slice(1));`） |
| T5 | `amadeus-state.ts:1070` fn=`main` | `      case "lookup":` | `main()` default case の unknown-subcommand usage message 文字列 | `:1099`（`Unknown subcommand: ${subcommand}. Valid: ...` を含むテンプレート） |
| T6 | `amadeus-state.ts:5683` fn=`handleMerge` | `  const pd = resolveProjectDir(projectDir);` | `handleSetConstructionIteration` の invalid-token mutation-before-reject `error()` | `:5824` 以降（`:5830-5832` の `parseConstructionIteration` reject 分岐） |
| T7 | `amadeus-state.ts:5736-5739` fn=`handleMerge` | `    // a prior successful merge (or a never-forked slug). Either way, no work` ほか（**コメント行を含む**） | `handleSetConstructionIteration` の missing-argument usage-error | `:5825-5828`（`if (args.length < 1) { error("Usage: amadeus-state.ts set-construction-iteration ...") }`） |
| T8 | `amadeus-orchestrate.ts:1707` fn=`trustedPluginStageFile` | `    const grant = record.trustGrant;` | `lstatSync` と O_NOFOLLOW open/fstat の間の fail-closed inode race guard | `:1726-1733`（`lstatSync(ancestor).isSymbolicLink()` / `const before = lstatSync(abs);` / `O_NOFOLLOW`） |
| T9 | `amadeus-orchestrate.ts:6189-6190` fn=`handleReport` | `` `Committed ${committed.join(" + ")} for "${slug}" (scope: ${scope}). ` + `` ほか | `handlePark` の project-dir binding と Kimi caller guard | `:6261` `function handlePark(_args: string[], projectDir: string \| undefined): void {` |
| T10 | `amadeus-orchestrate.ts:944-951` fn=`<module>` | `// The non-happy-path branches reuse amadeus-jump.ts ...`（コメント）/ `const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));` ほか | Phase 2 telemetry wiring | 同ファイルの telemetry seam（本エントリの解決先はコメント + `TOOLS_DIR` 定義であり telemetry ではない） |
| T11 | `amadeus-runtime.ts:878` fn=`compile` | `    graph.execution_observability = executionProjection;` | `MEMORY_EMPTY` 再発行 dedup（`auditBlockField` へ委譲） | `:899-914`（`findAllEvents(auditNow, "MEMORY_EMPTY")` を含む locked section） |
| T12 | `amadeus-learnings.ts:902-904` fn=`main` | `  if (cmd === undefined) {` / `    fail("Usage: amadeus-learnings.ts <surface\|persist\|--help>", 2);` / `  }` | Phase 2 telemetry wiring | `:910-914`（`try { initProcessObservability(...) } catch { }`） |
| T13 | `amadeus-graph.ts:1715-1720` fn=`gatedStagePredicate` | `  const nonInit = new Set(` / `    loadGraph()` / `      .filter((s) => s.phase !== "initialization")` ほか（**実行文**） | `stageGraphDrift` の多行 optional snapshot パラメータ**型**（runtime-erased） | `:1767-1770`（`export function stageGraphDrift(opts?: {` / `  graph?: readonly StageEntry[];` / `  stagesRoot?: string;` / `}): {`） |
| T14 | `amadeus-graph.ts:1711-1716` fn=`<module>` | `*  applies). Slugs absent from the graph are treated as non-gated (defensive;` ほか（**コメント + 実行文**） | 同上（T13 と同一 `reason` 文字列） | 同上 `:1767-1770` |
| T15 | `amadeus-utility.ts:820-822` fn=`<module>` | `    sameFileIdentity(current, expected);` / `}` （**実行文**） | `inspectHookHeartbeats` の snapshot options の多行 `Pick` **型** | `:861-864`（`options: Pick<` / `DoctorContext,` / `"platform" \| "heartbeatSwapTarget" \| "healthDirSwapTarget"` / `>,`） |
| T16 | `plugins/formal-model-check/tools/tla-arm.ts:199` fn=`<module>` | `  (record: Record<string, unknown>) => record.kind === "SubmitAmend" && isSubmissionRecord(record, record.kind),` | `assertTlaElectionAction` の防御的 TypeError throw 行 | `:202` `function assertTlaElectionAction(value: unknown): asserts value is TlaElectionAction {` 以降 |
| T17 | `amadeus-mirror-executor.ts:1471-1475` fn=`executeLinked` | `  } ` / `  if (` / `    context.operation === "close" &&` / `    viewed.issue.state === "CLOSED"` / `  ) {` | `latestProjectReconciliationReceiptKey` の防御的 fail-closed 分岐 | `:1678-1689`（`reconcileHeldProjectsUnderLock` 内、`latestReceiptKey === undefined` → `pendingProjectSync(...)`） |
| T18 | `amadeus-mirror-executor.ts:1480-1484` fn=`executeLinked` | `      viewed.receipt,` / `    );` / `    if (ensured.kind === "outcome") return ensured.outcome;` ほか | 同上（T17 と同一 `reason` 文字列） | 同上 `:1678-1689` |

*表中 `amadeus-*.ts` の相対パス省略形はすべて `packages/framework/core/tools/` 配下。*

### 4.1 Developer scan に対する訂正・追加

| 項目 | Developer scan の記述 | 本 scan の判定 | 根拠 |
|---|---|---|---|
| T14（`amadeus-graph.ts:1711-1716`） | 未検出（`:1715-1720` のみ列挙） | **追加**。同一 `reason` 文字列を共有する 2 エントリがどちらも `gatedStagePredicate` 領域へ解決し、真の対象 `stageGraphDrift` の `opts?` 型（`:1767-1770`）を指していない | `jq` で `amadeus-graph.ts` の全 5 エントリを列挙し、`:1130` / `:1134`（`opts?: {` / `graph?: readonly GraphStage[];` = **一致**）と対照 |
| T17 / T18（`amadeus-mirror-executor.ts`） | 「転位の疑い(**未確定** — 隣接コードの意味論確認が要る)」 | **確定へ昇格**。`reason` が名指す `latestProjectReconciliationReceiptKey` の使用点は `:1678` の 1 箇所のみで、その fail-closed 分岐は `:1682-1689`。解決先 `:1471-1484` は別関数 `executeLinked` | `grep -n "latestProjectReconciliationReceiptKey" packages/framework/core/tools/amadeus-mirror-executor.ts` = `:11`（import）/ `:1678`（唯一の使用点）。`:1668-1695` を実読 |
| P2c の 0 hit 主張 | 「0 hit（出力なし）」 | **手続きの訂正**（結論は不変）。当該述語は ugrep の複雑度上限で exit 1 になるため、出力なしは 0 hit の根拠にならない。分割述語で再実測して 0 hit を確定 | 上記 §2「P2c の訂正」 |
| 区間交差ファイル | 「6 ファイル中 `amadeus-orchestrate.ts` のみ変更」 | **範囲の拡張**（矛盾ではない）。被引用 11 パスへ広げると `amadeus-graph.ts` も区間内変更 | P6c |
| `source not found` の行 | `:390-392` | `:391`（単一行）。scan の範囲表記は該当行を含むため実害なし | `grep -n "source not found for semantic allowlist entry"` |
| 転位の総数 | 「新規に 10件以上」「`amadeus-state.ts` だけで6件」 | `amadeus-state.ts` 6 件は**一致**。総数は本 scan の判定基準で **18 件確定** | 上表 |

### 4.2 対照（`reason` と一致していた例 — 誤検出でないことの担保）

- `amadeus-election-store.ts:494-495` fn=`create` → `} catch {` / `return err("io-error");` ← reason「Defensive `readdirSync` catch after `mkdirSync(root, {recursive:true})` already succeeded」= **一致**
- `amadeus-election-store.ts:509` fn=`create` → `} catch {` ← reason「Defensive election-directory `mkdirSync` catch」= **一致**
- `amadeus-swarm.ts:1419` fn=`main` → `error: ` + テンプレート `Unknown subcommand: ${subcommand ?? "(none)"}. Valid: prepare, check, ...` ← reason「Unknown-subcommand usage message string in main()'s default case」= **一致**
- `amadeus-state.ts:991` fn=`main` → `  observeToolRun(subcommand);` ← reason「Phase 2 telemetry wiring」= **一致**
- `amadeus-graph.ts:1130` / `:1134` fn=`validateGrid` → `  opts?: {` / `    graph?: readonly GraphStage[];` ← reason「Optional graph snapshot property in validateGrid's multi-line opts type」= **一致**

**構造的所見**: 転位は台帳全体の腐敗ではなく**エントリ単位で混在**する。同一ファイル・同一 `reason` 文字列の群の中でも一致と転位が並存する（`amadeus-state.ts` の telemetry reason は `:991` が一致・`:916` が転位。`amadeus-graph.ts` の型 reason は `:1130` / `:1134` が一致・`:1711-1716` / `:1715-1720` が転位）。

---

## 5. 候補 51 件と未判定 43 件の扱い

`mismatch-survey.ts` の述語（逐語）: `reason` から camelCase / PascalCase 識別子を正規表現 `\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]{2,})\b` で抽出し、そのいずれかが (a) 解決先のスコープ名 `fn` に一致するか (b) 解決先の行本文に部分文字列として現れるかを判定。どちらにも当たらないものを候補として出力する。

結果（P4、stderr 逐語）: `total=623 withNamedIdentifier=125 noIdentifierHit=51`。

**候補 51 件は確定転位ではない。** 本 scan が verbatim 実読で adjudicate したのは上表 T1〜T18 と §4.2 の対照群であり、残る 43 件（51 − 上表のうち本述語に載った 8 件、内訳は §6 UNMEASURED-2）は**候補のまま**である。

**偽陽性の構造（実測に基づく分類）**:

1. **隣接記述型** — `reason` が「ある関数の直後の catch」「その分岐の手前」のように**位置関係**で対象を述べており、名指し識別子が対象行そのものには現れない。この場合、転位していなくても述語は候補として拾う。
2. **選言型 boilerplate** — `reason` が複数の可能性を `or` で並べており、そもそも特定の構文クラスを主張していない。observed の実測: 逐語「defensive, type-only, or spawned-boundary path」を含むエントリが **20 件**（P5f）、「Residual defensive, invalid-input, replay, or process-boundary」が **25 件**（P5g）。この 45 件は**構造的に反証不能**であり、どの機械述語でも真偽を決められない。
3. **述語の射程外** — `reason` が識別子を名指さない 498 件（623 − 125）は本述語に載らない。すなわち本述語の再現率は原理的に 20% を超えない。

したがって本述語は**スクリーニング用途に限り有効**であり、単独でゲート化できない。

---

## 6. UNMEASURED（本 scan で決着していない事項の正本）

- **UNMEASURED-1: 全数照合は未実施。** 検査したのは機械サーベイの候補 51 件と、`reason` の構文クラス主張から逆引きした少数のスポットのみ。**真の転位総数は不明**であり、確定 18 件は下限である。残り約 570 件は未検査。
- **UNMEASURED-2: 候補 51 件のうち 43 件が未判定。** 上表 T1〜T18 のうち本述語（P4）に載ったものは 8 件。差分 43 件は候補のままで、真偽は未確定。
- **UNMEASURED-3: `findStaleAllowlistEntries` の実行結果は未測定。** LCOV を要するため本 scan では `coverage:ci` を実行していない（`cid:code-generation:c1-coverage-single-owner` の単独所有規律により、RE 段で並行計測を起こさない判断）。「現在の台帳に stale エントリが何件あるか」は未測定。
- **UNMEASURED-4: 転位の双方向の実害は未定量。** 「本来 waiver すべき行が waiver されていない」と「waiver 不要の行が waiver されている」の件数・影響範囲はいずれも未測定。前者は patch gate の偽赤、後者は偽緑を生むが、どちらがどれだけ起きているかは LCOV と実 PR diff を要する。
- **UNMEASURED-5: Issue コメント既報の `amadeus-lib.ts` 4 エントリ・`amadeus-audit.ts` 1 エントリの帰趨。** `findActiveStandingGrant` を含む `reason` は observed の台帳に **0 件**（P7）。observed の `amadeus-lib.ts` エントリは 3 件、`amadeus-audit.ts` は 1 件。削除されたのか `reason` を書き換えられたのかは未確定。
- **UNMEASURED-6: 機械化可能量の見積りは仮説。** 構文クラスを主張する `reason`（type-only 76 + catch 32 + dispatch/usage 10、重複あり）が AST 述語で決定的に判定できるという見込みは**未検証**。1 件あたりの人手 adjudication コストも未実測。

---

## 7. 適用範囲外（明示）

本 RE は「裁定を証拠から下せる状態にする」ことのみを行った。次はいずれも本ステージの所掌外である。

- 転位 18 件の**是正方法**（`reason` を実所在へ書き換えるか、セレクタを真の対象へ張り直すか、エントリごと削除するか）の選定 — requirements-analysis / application-design の所掌
- 全数照合の**進め方**（AST 述語による二段構えを採るか、人手一括か）と、その工数見積り
- 機械ガード（`reason` と構文クラスの整合検査）の**設置先**（`coverage-patch-gate.ts` 内 / 別スクリプト / sensor）と CI 配線位置
- 選言型 boilerplate 45 件（P5f + P5g）を**許容するか禁止するか**の方針裁定
- Issue #1622 と #2162 / #2135 / #2134 / #2216 / #2112 / #2133 の統合・分離の裁定（#1622 最終コメントが「静的ゲート台帳の健全化」クラスタの driver と位置づけているが、本 scan は事実の並置のみを行い裁定はしない）
