# re-scan 記録 — 260814-ambient-error-sink

## メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-14` |
| Intent | `260814-ambient-error-sink`（scope `self-fix`、depth `Minimal`） |
| Base commit | `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` |
| Observed commit | `6e94189dec9e8e2bd0aaeb53bcff7cf9cba27440` |
| Focus | [Issue #3004](https://github.com/amadeus-dlc/amadeus/issues/3004) — in-process 呼出で `projectDir` を省略すると engine のエラー記録・state 書込が開発者の実 workspace へ着地する |
| Scan mode | **xrev differential scan**（run `xrev-260814-3004`、Issue #3004 のクロスレビューコメント 2 件が一次入力） |
| 書込範囲 | `codekb/amadeus/` 配下のみ（コード・テスト・state・audit の変更ゼロ） |

### base 選定根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` が記録する全 observed のうち、**HEAD の祖先で距離最小**のものを選んだ（`cid:reverse-engineering:rescan-base-ancestry`）。`5f6b5bf97` は直前 intent `260814-t528-ambient-isolation` の observed である。

- `git merge-base --is-ancestor 5f6b5bf97 6e94189de` → **rc=0**
- `git rev-list --count 5f6b5bf97..6e94189de` → **3**

### observed 選定根拠

`git rev-parse HEAD` = `6e94189dec9e8e2bd0aaeb53bcff7cf9cba27440` = `origin/main`。ローカル merge コミットではなく `origin/main` 系譜である（`cid:reverse-engineering:c2-observed-mainline-commit`）。

### scan mode と currency の判定

xrev differential scan を採った。Issue #3004 のクロスレビューコメント 2 件を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で抜き打ち二重化した。

- `git diff --name-only 5f6b5bf97 6e94189de -- packages/ tests/ .claude/` → **`tests/integration/t528-report-ack-kind.integration.test.ts` の 1 ファイルのみ / rc=0**
- `git diff --stat 5f6b5bf97 6e94189de` → 41 files / +1,438 / −14（差分の大半は `amadeus/` の record と `metrics/`）
- `packages/framework/core/tools/amadeus-orchestrate.ts` と `amadeus-lib.ts` は **base→observed で無変更** → xrev verdict と前 intent 節の行番号引用は observed でも行番号込みで有効（`cid:reverse-engineering:E-XBB-RE-S13-c2`）
- **表現形式の移行検査**（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: 区間 3 commits に患部のスキーマ・セレクタ形式を変える移行はなく、c5 の構造的不成立条件には**該当しない**

`t528` の差分内容は #2981 の是正そのもの（`handleReport([...], undefined)` → `handleReport([...], proj)` の explicit fixture 化と `semiAutonomyProject()` の追加）。**本 Issue はその「undefined を渡せてしまう形」が production 側に残っている残余**である。

## Architect による抜き打ち照合（spot check）

Developer scan の主張のうち、**修正設計が直接消費する核心 6 件**を observed 断面で独立に再実測した。全件について結論は一致し、うち 2 件で数値の転記差を検出した。

| # | 照合対象 | 実行した述語 | 結果 |
|---|---|---|---|
| S1 | `handlePark` が非 export であること | `sed -n '6405,6412p' packages/framework/core/tools/amadeus-orchestrate.ts` / `grep -c "export function handlePark" dist/claude/.claude/tools/amadeus-orchestrate.ts` | **一致**。core `:6407` は `function handlePark(...)`（export なし）、dist は **0 hit** |
| S2 | `emit()` の実行順と `recordEngineError` の逐語 | `sed -n '775,790p;800,835p' packages/framework/core/tools/amadeus-orchestrate.ts` | **一致**。`:803 recordEngineError(directive.message, _handlerProjectDir);`、`applyPendingAdvisoryGuard` は `:828` の `pending.length === 0` 返却 → `:829` の kind 判定 → `:831` の `resolveProjectDir` の順 |
| S3 | `resolveProjectDir` 26 箇所 | `grep -c "resolveProjectDir" packages/framework/core/tools/amadeus-orchestrate.ts` | **一致**（26） |
| S4 | 複雑度ラチェット | `tests/.complexity-baseline.json` を Python で直読 | **一致**。`threshold: 15`、`{"path":"packages/framework/core/tools/amadeus-orchestrate.ts","name":"handleNext","ordinal":0,"ccn":22}` |
| S5 | t214 の契約ヘッダと T1/T2 本文 | `sed -n '21,24p;126,151p' tests/unit/t214-engine-error-logged-seam.test.ts` | **一致**。契約ヘッダ逐語、`:131 recordEngineError("seam: something went wrong");`（projectDir 省略）、`:145 process.argv = [..., "--project-dir", proj];` |
| S6 | 3 ハンドラの export と `handlePark` の非 export | `grep -n "^export function handleNext\|^export function handleReport\|^export function handleFailureRuling\|^function handlePark" …` | **一致**（`:3107` / `:5848` / `:6348` が export、`:6407` は非 export） |
| S7 | 既着地行の述語 | 下記「述語 P-AUDIT」 | **述語ヒット 45 と内訳は完全一致**、集計欄の総数は不一致（下記 訂正 2） |

### Developer scan への訂正

**訂正 1 — `process.chdir` を使うテストのファイル数**。Developer scan は「7 ファイル（t268 / t487 / t481 / t230）」と記すが、括弧内の列挙は 4 件であり、同一述語の再実測でも 4 件である。

```
grep -rl "process.chdir" tests/
→ tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts
   tests/integration/t268-election-default-project-dir.integration.test.ts
   tests/integration/t481-resolve-project-dir-worktree-marker.test.ts
   tests/integration/t487-stage-stats.integration.test.ts   （4 ファイル）
```

**正は 4 ファイル**。この訂正は結論（既存 idiom は `t481` の `makeWorktreeFixture` + chdir save/restore）に影響しない。

**訂正 2 — `ERROR_LOGGED` の総行数**。Developer scan の集計欄は「全行数 148,805 / `ERROR_LOGGED` 2,242 / 述語 45」と記す。Architect の再実測では**全行数 148,805 と述語ヒット 45 と内訳 5 種は完全一致**したが、中間の `ERROR_LOGGED` 総数は JSON parse 基準で **1,148**、部分文字列一致（`grep -o "ERROR_LOGGED" | wc -l`）で **2,278** であり、2,242 はいずれとも一致しない。**本 Issue の主張が乗るのは述語ヒット 45 と内訳であって中間集計ではない**ため結論は無傷だが、**2,242 を成果物へ転記しないこと**。

**補足 — 「43」の由来**。Developer scan は既着地を「43（41 + seam 2）」と数える。これは述語ヒット 45 から `Unknown subcommand: (none)` の 2 行を除いた部分集合であり、除外根拠は scan 本文に明示されていない。受け入れ基準に使う場合は、**述語ヒット 45 を採るか、除外条件を明示した部分集合を採るかを選び、選んだ側の述語をそのまま併記する**こと（`cid:requirements-analysis:numbers-from-command-output-only`）。

## 述語一覧（実測コマンドと結果、測定 ref = observed 断面の作業ツリー）

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git rev-parse HEAD` | `6e94189dec9e8e2bd0aaeb53bcff7cf9cba27440` |
| P1 | `git merge-base --is-ancestor 5f6b5bf97 6e94189de` | rc=0 |
| P2 | `git rev-list --count 5f6b5bf97..6e94189de` | 3 |
| P3 | `git diff --name-only 5f6b5bf97 6e94189de -- packages/ tests/ .claude/` | 1 ファイル（t528）/ rc=0 |
| P4 | `grep -c "resolveProjectDir" packages/framework/core/tools/amadeus-orchestrate.ts` | 26 |
| P5 | `grep -c "export function handlePark" dist/claude/.claude/tools/amadeus-orchestrate.ts` | 0 |
| P6 | `grep -rl "process.chdir" tests/` | 4 ファイル |
| P7 | `git grep -n "requires --project-dir\|--project-dir is required\|projectDir is required" -- '*.ts'` | **0 hit / rc=0**（拒否メッセージの既存 precedent は不在） |
| P-AUDIT | `git ls-files 'amadeus/spaces/default/intents/*/audit/*.jsonl'` の各行を JSON parse し `attributes.Event === "ERROR_LOGGED"` かつ `attributes.Tool === "amadeus-orchestrate"` かつ `attributes.Command === ""` を数える | 対象 **250 ファイル** / 全 **148,805 行** / `ERROR_LOGGED` **1,148** / **述語ヒット 45**（内訳: `Unknown --result "failed"…` 32 / `report --result failed requires --failure…` 9 / `Unknown subcommand: (none)…` 2 / `seam: something went wrong` 1 / `seam: no state` 1） |

**計測規律メモ**: この環境の `grep` は ugrep ラッパであり、`\b` を含む ERE が **一致 0 件かつ rc=1** で無音終了する（`cid:reverse-engineering:c6-absence-predicate-exit-code`）。本記録の述語はすべて `\b` を使わない単純部分文字列 / 固定パターンであり、不在主張（P7）は rc=0 を確認済み。Developer scan 側の全数棚卸しは grep ではなく括弧バランスの抽出スクリプト（repo 外 scratch）で採られている。

## 更新した codekb 面

| 面 | 追加した節 | 本 intent の事実として引ける内容 |
|---|---|---|
| `architecture.md` | 「in-process 入口と emit 集約点における ambient 逸出面の全数（260814-ambient-error-sink、現在、observed `6e94189de`）」 | A: `_handlerProjectDir` 代入 5 箇所と export 実態、in-process 射程 = 3 入口 / B: `emit()` 集約点 3 面 + `raisePluginAdvisoriesFor` と実行順 / C: CLI と in-process を区別する型・分岐の不在（設計欠落） / D: `_handlerProjectDir` 外の 22 面と「入口で止めるしかない」という帰結 / E: 拒否ガードの既存様式と文言の不在 |
| `code-quality-assessment.md` | 「ambient error sink の修正を縛る既存契約と実測ラチェット（同上）」 | Q-1: t214 の 5 test と契約ヘッダ逐語 / Q-2: t258 の explicit 限定というギャップ / Q-3: **制約 7 条** / Q-4: 複雑度ラチェット（`handleNext` は上限ちょうど、新ガードは `refuseBlockedNextEnvironment` へ畳み込むのが既存様式） / Q-5: 着地行 45 と述語、undefined 形の直接証拠 2 行 / Q-6: OTel ピン仮説（**未実証と明記**） |
| `code-structure.md` | 「undefined 形の回帰テストが要求するシーム（同上）」 | 層の制約（integration 層が唯一の置き場、t481:4-9 逐語） / 系統 A（env 段、chdir 不要、fixture 要素 6 点） / 系統 B（marker 段、`hasWorkspaceMarker` 逐語と `t481` idiom） / 系統 C（3 点セットとテスト自身の安全性） |
| `reverse-engineering-timestamp.md` | 現在ポインタを本 intent へ更新、直前を履歴へ降格 | 中核知見 6 点の要約、更新面・無変更面の一覧 |

**前 intent 節との関係**: `architecture.md` の本 intent 節は、直前の履歴節（260814-t528-ambient-isolation）が記した **E1 / E2 を部分集合として包含する上位互換の全数棚卸し**である。両節は矛盾しない。履歴節の行番号引用は、`amadeus-orchestrate.ts` / `amadeus-lib.ts` が `base..observed` で無変更（P3）であるため observed でもそのまま有効である。

## レビュー済み無変更の面（沈黙のスキップではない）

| 面 | 無変更とした根拠 |
|---|---|
| `api-documentation.md` | 公開シグネチャ・入力ドメインに変化なし。本 intent は既存シグネチャの**呼出契約の運用**を扱う |
| `component-inventory.md` | component の新設・廃止・責務移動はゼロ。患部は既存 component 間の引数受け渡し |
| `technology-stack.md` | `base..observed` で bun / TypeScript / Biome / fast-check 不変、新規 runtime dependency なし |
| `dependencies.md` | 依存エッジの追加削除なし |
| `business-overview.md` | 業務価値面の記述に変化なし |

**この 5 面は本 intent の節を持たない。後続ステージがここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。既存の一般記述を前提として受け取ることは可。

## 後続ステージへの引継

- **requirements-analysis / application-design が引くべき面**: `architecture.md` の A〜E（逸出面の全数と設計欠落）、`code-quality-assessment.md` の Q-1〜Q-4（契約 7 条と複雑度ラチェット）
- **build-and-test / code-generation が引くべき面**: `code-structure.md` の系統 A / B / C（回帰テストのシーム）、`code-quality-assessment.md` Q-3 の 7 条（特に **7. `bun run build` 後に t214 を回す**）と Q-6（受け入れ検証に ambient 側 shard の空を必ず含める）
- **本 RE の所掌外（明示）**: 修正方式の選定（入口で拒否 / 型で表現 / `main` 側で事前解決）、拒否メッセージの文言、`handlePark` を対象に含めるか、Q-6 の未実証仮説を本 Issue に含めるか別途起票するか

## 検証

git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下の既存 4 面 + 本ファイルのみ。抜き打ち照合はすべて読取（`sed` / `grep` / Python の JSON 集計）で実施した。
