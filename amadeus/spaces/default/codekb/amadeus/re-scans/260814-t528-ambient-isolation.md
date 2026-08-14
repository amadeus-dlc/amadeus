# re-scan 記録 — 260814-t528-ambient-isolation

## メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-14` |
| Intent | `260814-t528-ambient-isolation`（scope `self-fix`、depth `Minimal`） |
| Base commit | `89532174c30ef9cc7ff29496cd6916586fdda00a` |
| Observed commit | `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` |
| Focus | [Issue #2981](https://github.com/amadeus-dlc/amadeus/issues/2981) — `tests/integration/t528-report-ack-kind.integration.test.ts` の失敗集合が実行文脈で入れ替わる。**機序 A / B の特定**が本スキャンの主題 |
| Scan mode | **xrev differential scan**（run `xrev-260814-2981`、target-sha `52f1f1b2575ea35bd23b761697b2d17a5e9a7ac3`、currency 成立） |
| 書込範囲 | `codekb/amadeus/` 配下のみ（コード・テスト・state・audit の変更ゼロ） |

### base 選定根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` が記録する全 observed のうち、**HEAD の祖先で距離最小**のものを選んだ（`cid:reverse-engineering:rescan-base-ancestry`）。本 intent に prior record は無い。

- `git merge-base --is-ancestor 89532174c30ef9cc7ff29496cd6916586fdda00a HEAD` → **rc=0**
- `git rev-list --count 89532174c..HEAD` → **9**

### observed 選定根拠

`git rev-parse HEAD` = `git rev-parse origin/main` = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`。ローカル merge コミットではなく `origin/main` 系譜である（`cid:reverse-engineering:c2-observed-mainline-commit`）。

### scan mode と currency の判定

xrev differential scan を採った。クロスレビュー verdict（run `xrev-260814-2981`、target-sha `52f1f1b25`）を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化した。

- `git log --oneline 52f1f1b25..HEAD` → **1 commit**（`5f6b5bf97 docs(norms): E-260813-RECORD-BUNDLING-NORM を選挙ストア索引へ登録する`）
- `git diff --name-only 52f1f1b25..HEAD -- <患部 5 パス>` → **空出力 / rc=0**（交差なし）→ 行番号再解決は構造的 no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`）
- **表現形式の移行検査**（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: 区間内の唯一のコミットはノルム文書の追補であり、患部のスキーマ・セレクタ形式を変える移行を含まない → c5 の構造的不成立条件には**該当しない**

## 述語一覧（実測コマンドと結果、測定 ref = observed 断面の作業ツリー）

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git rev-parse HEAD` / `git rev-parse origin/main` | 両者一致 `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` |
| P1 | `git log --oneline 89532174c..HEAD \| wc -l` | 9 |
| P2 | `git diff --name-only 89532174c..HEAD \| wc -l` | 183 |
| P3 | `git diff --stat 89532174c..HEAD \| tail -1` | +8710 / −8521 |
| P4 | `git diff --stat 89532174c..HEAD -- <患部 5 パス>` | `amadeus-orchestrate.ts` のみ（+30 / −6、1 file） |
| P5 | `git diff 89532174c..HEAD -- packages/framework/core/tools/amadeus-orchestrate.ts \| grep -c "^[+-].*\(resolveProjectDir\|runsQualityRepair\|failureAdmission\|handleStageFailureReport\)"` | **0**（rc=1、空一致）— 患部行は区間内無変更 |
| P6 | `git check-ignore -v dist` | `/Users/j5ik2o/.config/git/ignore:31:dist/`、**exit 0** |
| P7a | `git grep -ln '"stage-graph.json"' -- 'tests/**/*.test.ts' \| xargs git grep -ln '"dist"' \| wc -l` | 45 |
| P7b | `git grep -ln "AMADEUS_SRC\|AMADEUS_MEMORY_SRC" -- 'tests/**/*.test.ts' \| wc -l` | 182 |
| P7c | `git grep -ln "setupIntegrationProject" -- 'tests/**/*.test.ts' \| wc -l` | 84 |
| P7d | P7a∪P7b∪P7c（`sort -u \| wc -l`） | **278** |
| P7e | `git ls-files 'tests/**/*.test.ts' \| wc -l`（母数） | 1102 |
| P8 | `awk 'NR>=5848 && /^}/{print NR; exit}' packages/framework/core/tools/amadeus-orchestrate.ts` | 6338（`handleReport` 本体終端） |
| P9 | `ls dist/claude/.claude/tools/data/stage-graph.json` | 本 worktree では**実在**（rc=0）— 機序 B は本ツリーでは発火していない |

区間 `89532174c..HEAD` の 9 コミットの内訳: 機能変更 3 件（`8b6089275` team-up.sh 撤去 #2975 / `86feb2ee5` advisory handoff routing #2980 / `0fbbec42b` Lifecycle Guard Runtime #2986）、metrics snapshot 3 件、record checkpoint 1 件、ノルム文書 2 件。**いずれも本 intent の患部と交差しない。**

## 患部の機序 — 独立2機序の重ね合わせ

| 機序 | 患部 | 落ちるテスト | 発火条件 |
|---|---|---|---|
| A（xrev 確定、本 RE で再現） | `t528:124` の `handleReport(…, undefined)` → ambient 解決 → 実 record の autonomy に分岐依存 | test #3「a failed result remains a typed error directive」のみ | ambient 解決先の active intent が `semi` / `full` |
| B（Developer scan で新規特定） | `STOCK_GRAPH`（`t528:46-54`）が gitignore 対象の `dist/` を指す | test #4「a gated approve acks…」と #5「the idempotent stale re-report acks…」の**ちょうど2件** | `dist/claude/.claude/tools/data/stage-graph.json` が不在（＝`bun run build` 未実行の新規 worktree） |

両者は独立に発火する。「本線ツリーでは #3、隔離 worktree では #4/#5」という**集合の入れ替わり**はこの重ね合わせの帰結であり、片方だけの修正では現象が残る。

### t528 の 6 テストと projectDir の渡し方

| # | 行 | テスト名 | ハンドラ呼び出し | projectDir | graph 到達 |
|---|---|---|---|---|---|
| 1 | 101 | `` `committed` is a valid kind carrying a reason `` | なし（`validateDirective` 直呼び） | — | なし |
| 2 | 110 | `` `committed` requires `reason` and rejects unknown fields `` | なし | — | なし |
| 3 | 123 | `a failed result remains a typed error directive` | `handleReport(…, undefined)`（`:124`） | **undefined** | しない（`FORWARD_RESULTS` 手前で返る） |
| 4 | 131 | `` a gated approve acks with `committed` `` | `handleReport(…, proj)` | `freshProject()` | **する** |
| 5 | 144 | `` the idempotent stale re-report acks with `committed` `` | `handleReport(…, proj)` ×2 | `freshProject()` | **する** |
| 6 | 163 | `` the read-only latch still swallows a bare advancing next to `done` `` | `handleNext([], proj)` | `freshProject()` | しない（Branch 0 で返る） |

Issue 本文の「2テスト」は #4/#5、xrev の「test 1」は #3 を指す。

### 機序 A の全経路（observed 断面の実読）

1. `t528:124` が `handleReport(["--stage", "code-generation", "--result", "failed"], undefined)` を呼ぶ。
2. `handleReport` 冒頭（`amadeus-orchestrate.ts:5851`）で `_handlerProjectDir = projectDir;`（= `undefined`）。宣言コメント（`:5849-5850`）は逐語で `Record the project this handler operates on so emit()'s ERROR_LOGGED lands here, not the ambient CLAUDE_PROJECT_DIR, under in-process drivers (#1389).` と述べ、**この代入が ambient 逸出の防止機構であること**を明言するが、正規化前の値を入れるため `undefined` は素通りする。
3. failed-result 分岐（`:6020-6023`）: `const failureAdmissionDir = resolveProjectDir(projectDir);` / `if (flags.result === "failed" && runsQualityRepair(failureAdmissionDir)) {`。この分岐は `FORWARD_RESULTS` 検査（`:6039-6045`、`Unknown --result "failed"` の発行元）**より上**にある。
4. `resolveProjectDir`（`amadeus-lib.ts:232-269`）が ambient 解決する。段順: `:234` explicit → `:241` `CLAUDE_PROJECT_DIR` → `:250-251` cwd 祖先の workspace marker → `:256-258` script path → `:262-266` known harness dir → `:269` cwd。**段 3 があるため `CLAUDE_PROJECT_DIR` を消しても実 record に着地する**。
5. `runsQualityRepair`（`:5780-5783`）が `readProductionAutonomyProjection(projectDir)?.mode` を読み `semi`/`full` で true（定義は `amadeus-intent-autonomy-production.ts:166`）。
6. 本 worktree の読取専用プローブ実測: `resolveProjectDir(undefined)` = 本 worktree / `mode = "full"`（intentUuid `019ffda5-8b96-7498-a17d-f1766ea1ffd7`）/ `runsQualityRepair = true` → **#3 は必ず落ちる**。
7. `handleStageFailureReport`（`:5822`）へ入り、`--failure` 未指定のため `:5834-5839` の `report --result failed requires --failure <detail> — the typed failure the stage's referee returned.` が emit される。`kind === "error"` は満たすが `toContain('Unknown --result "failed"')`（`t528:128`）が落ちる。

### 機序 A の副作用 — 実 record の監査シャード汚染（#2981 本文の未記載側面）

`#3` の error directive は `emit()` の集約点（`:802-804`、verbatim `if (directive.kind === "error" && recordError) {` / `recordEngineError(directive.message, _handlerProjectDir);`）を通る。`recordEngineError`（`:941-968`）は `projectDir === undefined` のとき `process.argv` の `--project-dir` を探し、無ければ `resolveProjectDir(undefined)` へ落ちる。唯一のガードは `:958` の `if (!existsSync(stateFilePath(pd))) return;`。プローブ実測でこのパスは**実在する**（`…/intents/260814-t528-ambient-isolation/amadeus-state.md` exists = true）ため、`emitErrorAuditRow`（`:962`）が実 record の監査シャードへ `ERROR_LOGGED` 1 行を書く。

**限定**: `admitProductionStageFailure`（`:5840`）へは `--failure` ガードで到達しないため state 本体への書込は起きない。この限定は**制御フローの実読による判定であり、実行による確認ではない**。

**回帰テストのギャップ**: `tests/integration/t258-engine-error-ambient-shard-pollution.test.ts`（Issue #1389）はヘルパ `driveReportError`（`:87`）が `handleReport(["--result", "__not_a_verdict__"], target)`（`:91`）と **explicit target を渡す形しか固定していない**。`projectDir === undefined` の形は未被覆。

### 機序 B の全経路と落ちる実証

`t528:46-54` の `STOCK_GRAPH` = `<REPO_ROOT>/dist/claude/.claude/tools/data/stage-graph.json`、`beforeEach`（`:65`）で `process.env.AMADEUS_STAGE_GRAPH` に設定。`dist/` は gitignore 対象（P6）。不在時は `loadStageGraph()`（`amadeus-lib.ts:6954-6967`）が `Stage graph not readable at ${p}: ${errorMessage(err)}. ${hint}` を throw する。env 読取点は `amadeus-lib.ts:6924` と `amadeus-graph.ts:231`（いずれも `process.env.AMADEUS_STAGE_GRAPH ?? join(DATA_DIR, "stage-graph.json")`）。

**落ちる実証**（repo 外 scratch、`CLAUDE_PROJECT_DIR` を scratch へ固定し実 record への書込を構造的に遮断）:

- baseline（実在 graph）: `[t3 gated approve] PASS` / `[t4 stale re-report] PASS` / `[t6 readonly latch] PASS`
- treatment（不在パス）: `[t3 gated approve] FAIL: Stage graph not readable at …: ENOENT` / `[t4 stale re-report] FAIL: 同` / `[t6 readonly latch] PASS`

**報告された失敗集合（#4/#5 のちょうど2件、#6 は緑）と完全一致。**

### なぜ #6 だけ緑か（構造的説明）

`handleNext` の Branch 0（`amadeus-orchestrate.ts:3118-3120`、verbatim `// Branch 0 — turn-scoped no-op-next guard, before any state inspection` / `// (emitReadonlyLatchDone owns the rule).` / `if (emitReadonlyLatchDone(projectDir, flags, migration)) return;`）は状態検査より前に read-only latch を処理する。`emitReadonlyLatchDone`（`:3089`〜）→ `freshReadonlyLatchLabel`（`:3037`〜）はファイル 2 枚を読むだけでグラフに触れない。#4/#5 は `nodeForSlug(slug)`（`:2846-2848` → `loadGraph()`）へ到達する。

## explicit projectDir 経路上に残る ambient 依存の全数

`handleReport` 本体（`:5848-6338`、P8）の直接 `process.env` 参照は **1 箇所のみ**（`:5863` `const modeResult = resolveOperatingMode(process.env.AMADEUS_OPERATING_MODE);`）。呼出先経由:

| 面 | 位置 | 性質 |
|---|---|---|
| `AMADEUS_STAGE_GRAPH` | `amadeus-lib.ts:6924` / `amadeus-graph.ts:231` | **#4/#5 の実際の患部**（機序 B） |
| `pluginHostRoot()` | `amadeus-orchestrate.ts:1801-1809`（`process.env.AMADEUS_PLUGINS_HOST_ROOT ?? dirname(TOOLS_DIR)`） | **projectDir を引数に取らない**。常に実 repo の `packages/framework/core` を指し `advisoryReportHoldReason(pd, slug, pluginHostRoot())` で消費される。**テスト隔離の未閉シーム** |
| `detectHarnessType()` | `amadeus-harness.ts:123-133`（`AMADEUS_HARNESS_TYPE` / `CLAUDECODE === "1"` / harness dir 検出） | `report` では kimi caller 判定にのみ使用 |
| `refuseUnauthorizedKimiCaller` | `amadeus-orchestrate.ts:2969-2976`（`authorizeMainConductor(resolveProjectDir(projectDir))`） | explicit を渡す #4/#5 は ambient に落ちない。**#3 のみ ambient** |
| `AMADEUS_SKIP_ARTIFACT_GUARD` / `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` | テスト自身（`t528:66-67`）+ ランナー（`run-tests.ts:645-650`） | 二重設定であり実行文脈差は生じない |
| 子プロセス spawn | `amadeus-orchestrate.ts:5093-5094`（`cmd: [… "--project-dir", projectDir]` / `env: process.env`） | `--project-dir` が段 1 で勝つため子プロセスの解決先は汚染されない |

**#4/#5 が explicit を渡しているのに落ちる ambient 依存は `AMADEUS_STAGE_GRAPH` 経由の `dist/` 参照のみ**であり、これが実測で再現した。

## テスト基盤の `dist/` 依存クラス

`AMADEUS_SRC = <REPO_ROOT>/dist/claude/.claude`（`fixtures.ts:59`）と `AMADEUS_MEMORY_SRC = <REPO_ROOT>/dist/claude/amadeus`（`:93`）は `dist/` 依存であり、`setupIntegrationProject`（`:765`）を使う全テストが「新規 worktree で `bun run build` 未実行なら赤」という同一クラスを共有する。一方 `FIXTURES_DIR = <REPO_ROOT>/tests/fixtures`（`:94`）は追跡ファイルであり worktree 隔離の影響を受けない。

規模は **278 / 1102 テストファイル（約 25%）**（P7a〜P7e）。**t528 はこのクラスの 1 例にすぎず、t528 だけを直しても同種の不安定は残る。**

project.md の既存則 `cid:code-generation:solo-bolt-worktree-required`（「source-only 境界下の新規 worktree は依存インストールと `bun run build` を移設の定型手順に含める」）が運用面ではこれを覆っているが、前提が破れたときの失敗メッセージ（`Stage graph not readable at …`）は原因（`bun run build` 未実行）を名指さない。

## テストハーネスの env 伝播

`tests/run-tests.sh` は 16 行の薄いラッパで `exec bun "$SCRIPT_DIR/run-tests.ts" "$@"` するのみ。`run-tests.ts:645-650` が子プロセス env を `{ ...process.env, AMADEUS_TEST_NAME: base, AMADEUS_SKIP_ARTIFACT_GUARD: "1", AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" }` で構成するため、**開発者シェルの `CLAUDE_PROJECT_DIR`（Claude Code セッションでは設定される）がそのまま全テストファイルへ伝播する**。`resetAidlcEnv`（`fixtures.ts:103-105`）は `AMADEUS_DEFAULT_SCOPE` のみを削除し `CLAUDE_PROJECT_DIR` は未清掃。

ただし `resolveProjectDir` の段 3（cwd 祖先の workspace marker）があるため、**`resetAidlcEnv` に `CLAUDE_PROJECT_DIR` の削除を足しても機序 A は閉じない** — テストの cwd は repo であり同じ実 record に着地する（プローブは env を delete した状態で実測しており、それでも実 worktree に解決した）。

integration tier は `runFilesPartitioned`（`run-tests.ts:817`、`runTier` は `:811`）でファイル単位に並行実行され、`.serial.` を含むファイル名のみ直列。t528 は並行帯に入る。

## Developer scan への行番号訂正（observed 実読で確定）

| 対象 | scan / 前提の記載 | 実測 |
|---|---|---|
| `t258` の explicit target 呼出 | `:88` | **`:91`**（`:88` は `const originalLog = console.log;`、ヘルパ宣言は `:87`） |
| `handleNext` Branch 0 | `:3119-3120` | **`:3118-3120`**（`// Branch 0 —` は `:3118`） |
| `handleReport` 本体終端 | `:6450` | **`:6338`**（P8） |
| `copyTreeWithRetry` の #2397 / #1565 コメント | `fixtures.ts:600-616` | **`:602-617`**（`:600` は `RETRYABLE_COPY_CODES`） |
| 子プロセス spawn の `--project-dir` / `env` | `:5092` / `:5093` | **`:5093` / `:5094`** |
| `review..observed` 区間 | （currency 主張の前提） | **1 commit**（`52f1f1b25..HEAD`）。交差は空出力 |

いずれも主張の実質は不変。訂正後が正本。

## 未実測・推測として明示する項目

- **UNMEASURED-1（仮説 H1）**: xrev の C5/C2 が観測された「origin/main 隔離 worktree」で `bun run build` が未実行だったこと。機序 B の再現と整合するが、当該 worktree は現存せず `dist/` の実在状態は未観測。**未検証**。
- **UNMEASURED-2（仮説 H2）**: `pluginHostRoot()` が実 repo を指すことにより、composed plugin の advisory が `advisoryReportHoldReason` 経由で #4/#5 を保留させうる。本 worktree の baseline は緑で**現時点では発火していない**が、plugin 構成の異なる worktree では別の不安定要因になりうる。**未検証**。
- **UNMEASURED-3**: テスト並行実行（既定 `DEFAULT_PARALLEL = Math.min(availableParallelism(), 4)`、`run-tests.ts:54`）の #2981 への寄与。t528 の各テストは自前 mkdtemp プロジェクトを使うため干渉面が見当たらないが、負荷起因の `cpSync` / `rmSync` 不安定（`fixtures.ts:602-617` の `copyTreeWithRetry` 宣言コメントが #2397 / t99 / #1565 を名指す）は別系統として存在する。**未検証**。
- **UNMEASURED-4**: 機序 A の state 本体非汚染（`admitProductionStageFailure` 未到達）は制御フローの実読による判定であり、**実行による確認ではない**。
- ファイル**間**の in-process env リークは構造的に起こりえない（`run-tests.ts:665-681` が `bun test <file>` をファイルごとに別プロセスで spawn）。ファイル**内**のリークは可能だが、t528 自身は `CLAUDE_PROJECT_DIR` に一切触れないため t528 内でのリークはない。

## 更新した成果物

- `code-quality-assessment.md` — 新現在節「テスト実行文脈への依存 — 失敗集合が入れ替わる二重機序」（機序 A/B 対比表、Q-1 ambient 解決の露出、Q-2 監査シャード汚染と t258 のギャップ、Q-3 `dist/` 依存クラス、#6 が緑である構造的説明、落ちる実証、未検証項目）
- `architecture.md` — 新現在節「projectDir 解決の段構造と in-process 呼出における ambient 逸出」（6 段ラダー表、逸出点 E1/E2 と閉包点の相違、explicit 経路上の ambient 依存 5 面）
- `code-structure.md` — 新現在節「テスト基盤の `dist/` 依存と env 伝播」（患部ファイル表、外部前提の 3 層図とテキストフォールバック、クラス規模の実測述語、fixture ライフサイクル）
- `reverse-engineering-timestamp.md` — 共有 freshness pointer に本 intent の現在メタデータを追加、直前の現在節を履歴へ降格
- `re-scans/260814-t528-ambient-isolation.md` — 本ファイル（新規）

直前の現在節（`260813-lifecycle-guard-runtime` / `260813-advisory-requestion-fix` / `260813-remove-team-up`）は本文保持のまま履歴ラベルへ降格した（`cid:reverse-engineering:c1` / `c3-relabel`）。`grep -rn "、現在、observed\|（現在: " *.md` の残存ヒットが本 intent の節のみであることを機械確認した。

## レビュー済み・無変更の成果物

**沈黙のスキップではなく、レビュー済みで無変更**である。

| 成果物 | 無変更の理由 |
|---|---|
| `api-documentation.md` | 本 intent は既存関数の**呼出契約の運用**を扱い、公開シグネチャ・入力ドメインの新規事実を持たない。`resolveProjectDir` / `handleReport` の契約自体は base から不変 |
| `component-inventory.md` | component の新設・廃止・責務移動はゼロ。患部は既存 component 間の引数受け渡しにある |
| `technology-stack.md` | `base..observed` で bun / TypeScript / Biome / fast-check 不変、新規 runtime dependency なし |
| `dependencies.md` | 依存エッジの追加削除なし |
| `business-overview.md` | テスト実行の再現性は開発者体験の問題であり、業務価値面の記述に変化なし |

**この 5 面は本 intent の節を持たない。後続ステージが本 intent の事実をここから引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。本 intent の事実を引けるのは上記「更新した成果物」の 4 面と本ファイルのみである。

## 適用範囲外（明示）

修正方式の選定はすべて requirements-analysis / application-design の所掌である。

- 機序 A の閉包点: テスト側を explicit projectDir へ直すか、production 側（`_handlerProjectDir` を `resolveProjectDir` 適用後の値で埋める / `recordEngineError` の ambient 段を fail-closed にする）を直すか、両方か
- `undefined` を `handleReport` の引数契約から排除するか、実行時に拒否するか
- 機序 B の扱い: `dist/` 前提の loud fail 化（graph 不在時に `bun run build` を名指す）を行うか、テスト基盤の依存構造そのものを変えるか、運用則（`cid:code-generation:solo-bolt-worktree-required`）のままとするか
- `pluginHostRoot()` に projectDir を通すか否か
- `undefined` 形の回帰テストの設置先と形（t258 の拡張か新規か）
