# re-scan: 260810-numeric-provenance-guard（Issue #2815）

**測定 ref**: observed = `40056d0ec`（`origin/main`。コード面は本 worktree HEAD `8402e5c5eceec24232e4d8de4f5adec0f5341b09` と **byte 同一** — Developer scan §0 実測）
**Base**: `df1c874cfb397fafe877a72f00a82664a59689ae`（`re-scans/` 中で最新の observed = 直前 intent `260810-plugin-harness-dir-token` の observed。HEAD の祖先であることを実測確認。区間 = **11 commits**（`40056d0ec` まで）+ record 2 commits。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: `self-feature`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Standard**
**Focus**: [Issue #2815](https://github.com/amadeus-dlc/amadeus/issues/2815) — 成果物数値の provenance ガード**第1段**（= 数値主張の近傍に集計コマンド／測定 ref が**併記されているか**を測る advisory センサー）。クロスレビュー 2 件 **CONFIRMED_WITH_REFINEMENTS**、対象 SHA `c909b6130`、収束 **ESTABLISHED_WITH_REFINEMENTS**
**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー verdict を Developer scan の一次入力とし、observed 断面の verbatim 実読で二重化
**行番号 currency（実測の記録であり免除の主張ではない）**: `git diff --name-only c909b6130..40056d0ec`（測定区間は `review..observed` に固定、`..HEAD` ではない — `cid:reverse-engineering:E-XBB-RE-S13-c2`）は **sensor 正本に非交差** — `packages/framework/core/sensors/**` および `packages/framework/core/tools/amadeus-sensor*.ts` に変更なし。交差はテスト面（`t514` 等）のみで、そちらは scan が現行断面で再解決済み
**副作用**: git 状態変更・GitHub 書込・engine 操作（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）は **すべてゼロ**。coverage 実行もゼロ（`cid:code-generation:c1-coverage-single-owner`）。書込は codekb 配下のみ
**tNNN 予約**: 連番系列の使用済み最大 **`t531`**、本 intent は **`t532`** 以降を予約（`cid:code-generation:swarm-test-number-reservation` / `c1-tnnn-collision-on-regrounding` — PR 発行前・マージ直前に固定 base SHA の `tests/` で再確認すること）

---

## 検索述語（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review`（E-ASD-RES13 追補 — 述語をそのまま再実行できる形で結果と同所に置く）に従う。パターン・対象ディレクトリ集合・除外条件の 3 要素を記載する。

| ID | 述語（対象集合・除外を含む） | 結果 |
|---|---|---|
| P0 | `git merge-base --is-ancestor 40056d0ec HEAD` / `git diff --name-only 40056d0ec HEAD`（除外なし） | exit 0（祖先）/ **14 ファイル、全て本 intent の record 配下**（`amadeus/spaces/default/intents/260810-numeric-provenance-guard/**` 13 件 + `intents.json`）→ **コード面は byte 同一** |
| P1 | `ls packages/framework/core/sensors/*.md`（除外なし） | **13 件** |
| P2 | `ls .claude/sensors/*.md`（除外なし） | **13 件**、core と**同名で 1:1 一致**（各ファイルのサイズが 8 バイト小 — 内容差は **UNMEASURED**） |
| P3 | `grep -rn "file:line\|existsSync(.*cited\|verifyCitation\|checkCitation" packages/framework/core/tools/*.ts packages/framework/core/hooks/*.ts` | **0 hit** |
| P4 | `ls packages/framework/core/sensors/ \| grep -iE "cit\|prov\|numer"` | **0 hit** |
| P5 | `ls packages/framework/core/tools/ \| grep -iE "cite\|citation\|provenance\|numeric"` | `amadeus-mirror-provenance.ts` **のみ**（GitHub mirror の所有権 provenance — 無関係） |
| P6 | `grep -rn "provenance" packages/framework/core/tools/*.ts`（承認 / mirror / presence / human を出現単位で除外 — `cid:requirements-analysis:grep-occurrence-level-exclusion`） | `amadeus-advisory-choice.ts` の TLA モデル digest 検証のみ（無関係） |
| P7 | `ls tests/{unit,integration,smoke,e2e} \| grep -oE '^t[0-9]+-'`（接頭辞厳密、除外なし） | 連番系列の最大 = **531**（`t2790-plugin-staging-seed-harness-dir.integration.test.ts` は Issue 番号由来の系列外） |
| P8 | `find amadeus/spaces/default/intents -name '*.md' \| wc -l` | **8,503** |
| P9 | `find amadeus/spaces/default/codekb -name '*.md' \| wc -l` | **135** |
| P10 | `find amadeus/spaces/default/intents -maxdepth 1 -mindepth 1 -type d \| wc -l` | **154** |
| P11 | `find amadeus/spaces/default/intents -name 'code-summary.md' \| wc -l` / 同 `requirements.md` / 同 `build-test-results.md` / `-path '*/verification/*.md'` | **366** / **139** / **129** / **313** |

P8〜P11 の測定 ref は HEAD `8402e5c5`。記録面は `40056d0ec` と同一ではないため、intents 系の件数は本 intent の 13 ファイル分を含む（差分は `260810-numeric-provenance-guard/**` のみ）。

---

## 1. センサー機構の全体像 — 新規追加の配線コスト

### 1-a. frontmatter スキーマ

`packages/framework/core/tools/amadeus-sensor-schema.ts:57-63` の `REQUIRED_FIELDS`（verbatim）:

```
const REQUIRED_FIELDS = [ "id", "kind", "command", "default_severity", "description" ] as const;
```

optional は `category` / `input_schema` / `output_schema` / `matches` / `timeout_seconds`（`:23-26` のコメントと `:44-52` の `interface SensorManifest`）。`kind` は `"deterministic"` 単一値。`default_severity` は `SENSOR_SEVERITIES` の集合 membership で検証され、非該当値は **compile 時 loud reject**（`:153-158` `default_severity must be one of ...`）。

### 1-b. ⭐ 主要所見 — 新センサー追加に必要な配線は **2 点のみ**（registry も switch も存在しない）

- **dispatcher は manifest 駆動**。`resolveScriptPath`（`amadeus-sensor.ts:213-229`）が manifest の `command:` から `.ts` basename を抜き、`__FILE_DIR` の隣で解決する（verbatim）:

  ```
  const tsToken = tokens.find((t) => t.endsWith(".ts"));
  ...
  const scriptDir = process.env.AMADEUS_SENSOR_SCRIPT_DIR ?? __FILE_DIR;
  return join(scriptDir, basename);
  ```

- **ハーネス投影も自動**。全 8 ハーネス manifest が `{ src: "sensors", dst: "sensors" }` を**ディレクトリ単位**で持つ（`packages/framework/harness/claude/manifest.ts:63` ほか、8/8 で 1 件ずつ）。

したがって「manifest 1 件 + `amadeus-sensor-<id>.ts` 1 件 + 対象 stage の `sensors:` 1 行」で完結する。

### 1-c. 例外配線 — dispatcher の per-sensor 追加引数アーム

`amadeus-sensor.ts:455-500` に per-sensor の引数分岐が実在する: `isCodeSensor = id === "linter" || id === "type-check"` で `--file-path` / `--output-path` を切替、`id === "upstream-coverage"` で `--consumes`、`id === "required-sections"` で `--templates-dir`、さらに `depthBudgetArgs(id, ...)` / `unitKindArgs(id, ...)`。

**追加入力を必要としないセンサーはここに触れる必要がない**（`--stage` + `--output-path` のみ）。第1段が追加入力を要求しない設計であれば `amadeus-sensor.ts` は無改変で済む。

### 1-d. fire の経路（`amadeus-sensor.ts` handleFire）

1a manifest 解決 → 1b `loadGraph()` で stage 存在検証 → 1c `existsSync(outputPath)` 不在は `dispatchError` → 1d **matches フィルタ再適用**（`:424-429`、不一致は exit 1 の matches-rejection）→ 1e fireId（4 バイト hex）→ 4 ロック内で `SENSOR_FIRED` emit → 5 `spawnSync("bun", [scriptAbsPath, ...scriptArgs], { cwd: projectDir, timeout })` → 7 **FAILED 時のみ** detail ファイルを `amadeus-docs/.amadeus-sensors/<stage>/<id>-<fireId>.md` へ `wx`+rename で書く → `SENSOR_PASSED`（`:844`）/ `SENSOR_FAILED`（`:856`）を emit。

### 1-e. exit code 契約（`amadeus-sensor.ts:29-30` verbatim）

```
CLI exits non-zero ONLY on dispatcher invocation errors (unknown id, missing flag, missing path, matches-rejection). Sensor outcomes are advisory and
```

**verdict は exit code で読めない** — 既存ノルム `cid:requirements-analysis:manual-sensor-fire-before-gate-report` の追補（fire は dispatcher 起動エラー以外で常に exit 0、判定は audit の `SENSOR_PASSED` / `SENSOR_FAILED` 行と FAILED 時のみ生成される detail finding ファイル）と整合。

---

## 2. `nfr-budget` 先例の解剖 — 第1段の最良テンプレート

`packages/framework/core/tools/amadeus-sensor-nfr-budget.ts`（**1,185 行**）。**数値主張検査の既存実装がここにある**。

### 2-a. 数値閾値の regex（`:242-270`）— provenance ガードでほぼそのまま再利用できる語彙

```
const NUMERIC_COMPARATOR = "(?:<=|>=|[<>≤≥=]|以内|以下|以上|未満|超|約|最大|最小|上限|下限)?";
const NUMERIC_VALUE = "[0-9]+(?:[.,][0-9]+)*";
const NUMERIC_UNIT = "(?:ms|msec|sec(?:s|onds?)?|s|mins?|...|件|回|台|人|個|条件|同時)(?![A-Za-z])";
const NUMERIC_THRESHOLD = new RegExp(`${NUMERIC_COMPARATOR}[ \\t]*${NUMERIC_VALUE}[ \\t]*${NUMERIC_UNIT}`);
```

**設計上の要点 2 つ**（`:255-260` の趣旨）:

1. **単位トークン必須が vacuity guard** — `PERF-3` の id 数字・見出し番号 `3.2`・日付 `2026-08-09` がしきい値に化けるのを防ぐ（`cid:code-generation:vocabulary-collision-vacuity-guard` の実装例）。
2. **部品間の空白は `[ \t]` のみで `\s` にしない** — 行境界をまたぐと「本当に欠けているしきい値」を隠す。

> ⚠ 第1段では検出したい母集団が逆向き（`nfr-budget` は「しきい値の**不在**」、provenance ガードは「数値主張の**存在**とその近傍の provenance」）である点に注意。単位トークン必須の vacuity guard をそのまま持ち込むと、単位を伴わない件数語（「16 中 54」等）が母集団から落ちる。**母集団定義は第1段の設計裁定事項**であり、本 RE は語彙の実在を確定したのみ。

### 2-b. 近傍窓の既存実装 = `idBlocks(body)`（`:278-297`）

宣言行から次の宣言行の直前まで（最後は EOF まで）を 1 ブロックとし、`idsMissingNumericThreshold`（`:300-306`）が各ブロックへ述語適用。同一 id の複数宣言は **union**（どれか 1 つに数値があれば充足）。**第1段の「数値の近傍に集計コマンド／測定 ref があるか」はこの構造の写像で書ける**。

ただし `idBlocks` / `nfrIdDeclarations` は **export されていない**（後述 §7-b）。

### 2-c. 閾値定数と観測レンジ根拠（`:818`, `:829` verbatim）

```
export const NFR_REQUIREMENTS_STANDARD_BUDGET = 1200;   // n=78, min 299, median 657, max 2290 → 12/78 = 15.4% flag
export const NFR_DESIGN_STANDARD_BUDGET = 1200;         // n=78, min 130, median 769, max 2553 → 16/78 = 20.5% flag
```

コメントが `cid:code-generation:c1-threshold-inside-observed-range` を明示引用し、「観測レンジの内側」「中央値の約 1.8 倍」「10-30% の flag-rate band」を根拠として書いている。**第1段の閾値（近傍窓の行数など）も同じ様式で corpus 実測から導く必要がある**（両側契約 = 観測最小値 < 閾値 < 観測最大値）。

### 2-d. verdict の返し方（`:930-935`）

`verdict()` が `pass: findings.length === 0` を**機械導出**し、`findings_count` を同時に埋める。`NONE` 定数（`:915-928`）が「非該当」時の全ゼロ shape。**エラーは投げず全て verdict**（`"not-nfr-artifact"` / `"no-file"` / `"empty"`）。

### 2-e. テスト構造（`tests/integration/t514-nfr-budget-sensor.integration.test.ts`、**1,128 行**）

ヘッダ（`:1-28`）が構造を宣言する三部構成:

1. manifest が shipped schema で well-formed + advisory + `matches` が**両方の glob エンジン**（dispatcher の `matchesGlob` と hook の `Bun.Glob`）で一致すること
2. 述語の測定
3. **enforcement cutoff の両方向**（落ちる実証 + その裏側）

さらに **corpus sweep** を同ファイルに同居（`:72` `const CORPUS = join(REPO_ROOT, "amadeus/spaces/default/intents")`）し、`cid:code-generation:corpus-sweep-for-new-guards` を明示引用。in-process seam は **named export の直 import**（`:44-66` で `evaluateNfrBudget` / `idsMissingNumericThreshold` / `main as sensorMain` ほか 15 個、加えて dispatcher の `depthBudgetArgs, matchesGlob, unitKindArgs`）。層は **integration**（`:26-27` が `cid:code-generation:fs-tests-integration-first` を引用）。

---

## 3. `answer-evidence` 先例 — cutoff 機構と述語再利用

`packages/framework/core/tools/amadeus-sensor-answer-evidence.ts`（**135 行**、最小構成の見本）。

### 3-a. cutoff（8,503 件の既存コーパスへ遡及適用しないための必須機構）

定数は `amadeus-lib.ts` の `QUESTIONS_EVIDENCE_CUTOFF_YYMMDD`（`:19` で import）。判定は `intentDateFromPath`（`:62-69`）が outputPath の `intents/<dir>/` セグメントを取り、`dir.slice(0, 6)` を整数 parse（verbatim）:

```
const idx = segments.indexOf("intents");
if (idx === -1 || idx + 1 >= segments.length) return null;
const date = Number.parseInt(dir.slice(0, 6), 10);
```

`date === null || date < CUTOFF` → `skipped("pre-cutoff")`（`:83-85`）。**undatable も pre-cutoff 扱いで fail-open**。

### 3-b. 述語再利用のイディオム

`checkQuestionsEvidence(outputPath)` を verbatim 呼び、判別 union を 1:1 写像（`:86-88`）。`:8-9` verbatim:

```
It is a thin adapter: it re-uses the shipped predicate verbatim and never re-implements or alters its semantics.
```

### 3-c. Result 不変条件

`:24-33` のコメント + `skipped` / `passed` / `failed` の 3 コンストラクタ: `pass === false ⇒ findings_count === 1 AND skipped === null`。

### 3-d. 兄弟イディオムからの**意図的逸脱の明文申告**（`:11-17`）

`required-sections` は outputPath 不在で exit 1 するが、**このセンサーはしない** — 述語が「未執筆」を pass に写すため。exit 1 は flag 欠落のみ。`cid:application-design:citation-semantics-check`（引用の意味論適合 — 相違は意図的相違として明記する）に従った好例。

---

## 4. `depth-budget` / `question-budget` / `scope-sizing` — 閾値の持ち方 3 パターン

| センサー | `matches` | 閾値の持ち方 |
|---|---|---|
| depth-budget | `**/inception/requirements-analysis/requirements.md` | `DEPTH_BUDGETS`（`:62-66`）= `{ Minimal: 1800, Standard: 2400, Comprehensive: undefined }`。`undefined` は「天井なし」で `verdict("no-ceiling", ...)`。比較は `bytes > ceiling * frCount`（丸め前の厳密値） |
| question-budget | `**/*-questions.md` | `QUESTION_BUDGETS`（`:39`）+ `QUESTION_BUDGET_CUTOFF_YYMMDD = 260809`（`:63`）、判定 `recordDate >= CUTOFF`（`:228`） |
| scope-sizing | `**/scope-definition/*.md` | **閾値なし**。`measureCapabilities`（`:146-159`）が backlog-table → scope-document-table → scope-document-list の優先順で数え、`source` を併記して**報告のみ** |

`scope-sizing` の manifest description verbatim:

```
so the depth-versus-size band can be set once the distribution exists
```

**第1段の設計語彙として重要**: `scope-sizing` は「**分布が揃うまで閾値を置かない、測るだけ**」という先例を提供する。provenance ガードも corpus 分布が未知なら同型の「測定のみ → 後で band」が正当な第1段の形になる（`cid:code-generation:c1-threshold-inside-observed-range` の両側契約を満たせない段階で閾値を置くことの回避）。

---

## 5. 数値 provenance の供給側 — 既存の一貫様式

### 5-a. `stage-stats` の measurement ref

`packages/framework/core/tools/amadeus-stage-stats.ts:964`（見出し）+ `measurementRefLines`（`:938-956`）verbatim:

```
# stage-stats — measurement ref

- scan scope: <...>
- shards: <n>
- lines: <n>
- broken-line: <n>
...
- constructed-windows: <n>
- net-population: <n>
```

加えて**恒等式行**（`:970-971`）:

```
Identity W: <n> constructed = <n> population + <n> unclosed-idle + <n> zero-second
Identity M: <n> total = <n> attributable + <n> unresolved
```

### 5-b. `subagent-stats`（`amadeus-subagent-stats.ts:193-198`）verbatim

```
subagent-stats — measurement ref
  measured at: <iso>
  scan scope:  <...>
  shards:      <n>
  events:      <n> completed / <n> started
```

### 5-c. 受理形の含意

供給側は「`# <tool> — measurement ref` ヘッダ + `scan scope:` / `measured at:` / `shards:` の `key: value` 行」という**既存の一貫様式**を持つ。第1段の「併記の受理語彙」はこの様式（+ ノルムが要求するバッククォート内の集計コマンド、`git rev-parse` 由来 SHA、observed ref）を対象にできる。

⚠ ただし **成果物コーパス内でこの様式が実際に使われている出現率は UNMEASURED**（供給側の出力形式のみ確認）。

---

## 6. stage 配線と advisory 契約

### 6-a. 経路

stage frontmatter `sensors: [<id>]`（pull import）→ compile（`amadeus-graph.ts:2388` `stage.sensors_applicable = (stage.sensors?.length ?? 0) === 0 ? ...`）→ `SensorResolution` 行（`:127-142`: `id` / `path` / `matches?` / `category?` / `severity?`）→ directive（`amadeus-orchestrate.ts:2704`: `sensors_applicable: (node.sensors_applicable ?? []).map((s) => s.id)`）→ PostToolUse hook（`packages/framework/core/hooks/amadeus-sensor-fire.ts`）が graph から読んで per-entry で fire。

### 6-b. ⭐ advisory はグラフに書かれない（golden byte 不変）

- manifest の `default_severity`（schema `:16-19` verbatim）: `"advisory" records SENSOR_* audit rows only; "blocking" additionally gates the stage's approval`
- compile 側（`amadeus-graph.ts:809-811`）: `if (sensor.manifest.default_severity !== "advisory") { entry.severity = ... }` — `:134-139` のコメント: `ABSENT for the framework default "advisory"` / `readers gate on severity === "blocking"`
- hook 側（`amadeus-sensor-fire.ts:14-18` verbatim）: `Exit-code contract (G5): always exit 0.`
- 承認ガード側の読み手: `amadeus-state.ts:1772-1778`（`for (const row of node.sensors_applicable ?? [])`）

**含意**: `default_severity: advisory` の新センサー追加は **グラフ golden を byte 不変に保てる**。

### 6-c. 未知 id は compile で loud fail

`amadeus-graph.ts:716` verbatim: `Unknown ids fail loud at compile — not silently`。

### 6-d. 現行の stage 別 `sensors:` 分布（実測）

| stage | 件数 | 内訳 |
|---|---|---|
| `nfr-requirements` | **7** | `required-sections, upstream-coverage, linter, type-check, answer-evidence, question-budget, nfr-budget` |
| `requirements-analysis` | **5** | — |
| `build-and-test` | **5** | — |
| `code-generation` | **6** | — |

`sensors:` を宣言する stage は **32 件中 29 件**（initialization 3 件は `sensors: []`）。

---

## 7. #1237 隣接 — 引用実在チェッカーの不在（反証確認済み）

### 7-a. 不在の確認

述語 P3〜P6（§検索述語）で **不在を確認**。`cid:requirements-analysis:absence-claim-grep-verify`（不在主張は全域 grep で反証確認してから書く）に従う。

**唯一の近縁** = `amadeus-norm-metrics.ts` — ただし対象は memory 層の **cid 引用回数の集計**（`:10-24`）であって、file:line の実在検証ではない。

### 7-b. 共有できる seam

| seam | 所在 | 備考 |
|---|---|---|
| `requireFlagValue(argv, index, flag, fail)` | `amadeus-sensor-flags.ts` | 全 per-sensor CLI が使う厳格な flag 読み（fail 注入型）。**新センサーも必ずこれを使う**（`cid:code-generation:verification-numeric-parse` / Issue #2741 の fail-open 是正の着地面） |
| `idBlocks` / `nfrIdDeclarations` | `amadeus-sensor-nfr-budget.ts` | **近傍窓ヘルパの唯一の先例**。**export されていない** → 第1段は同型を自前で持つか、export 化を提案するかの**選択が要る**（設計裁定事項） |
| `canonicalDepth` / `readRecordDepth` | `amadeus-sensor-depth-budget.ts` | `nfr-budget` が直 import 済み。**sensor 間の相互 import は既存イディオム**（`amadeus-sensor-flags.ts:20-24` のコメントが明示的に許容） |

**汎用の md 走査ユーティリティは存在しない**（`amadeus-sensor-required-sections.ts` の export は `fail` と `main` のみ）。各センサーが `readFileSync` + `split("\n")` を自前で持つのが現行の一貫パターン。

---

## 8. corpus の所在と規模（実測 — 述語は P8〜P11）

| 対象 | 実測値 |
|---|---|
| intent record 内 `*.md` | **8,503** |
| codekb `*.md` | **135** |
| intent ディレクトリ | **154** |
| `code-summary.md` | **366** |
| `requirements.md` | **139** |
| `build-test-results.md` | **129** |
| `verification/*.md` | **313** |

---

## 9. テスト規約（第1段の実装契約）

- **命名**: sensor 系テストは `t<NNN>-<slug>.integration.test.ts` / `.test.ts`。連番系列の最大 = **531** → 次の採番は **t532**（述語 P7）
- **層区分**: 実 FS を触るものは **integration**（t514 ヘッダ `:26-27` verbatim: `Touches a real filesystem (fixtures on disk + the real manifest and corpus), hence the integration tier (fs-tests-integration-first).`）。純関数は unit（例: `tests/unit/t86-sensor-manifest-schema.test.ts`, `t520-sensor-flag-strict-parse.test.ts`）
- **in-process seam**: 全 per-sensor スクリプトが `evaluate*` と `main` と `fail` を named export し、`if (import.meta.main) main();` でガード。`answer-evidence.ts:110-113` verbatim が理由を明記:

  ```
  reached from main it runs inside a spawned child, which bun's coverage does not measure, so the arm would sit permanently uncovered
  ```

  （`cid:requirements-analysis:bun-coverage-spawn-blindspot` / `cid:code-generation:seam-export-handler-amend` の着地形）

---

## 第1段実装への含意（RE の所見 — 設計裁定は下流の所掌）

1. **配線コストは低い** — manifest 1 件 + `amadeus-sensor-<id>.ts` 1 件 + 対象 stage の `sensors:` 1 行追加で完結。dispatcher に registry も switch もなく、追加入力が不要なら `amadeus-sensor.ts` を触らずに済む。`default_severity: advisory` ならグラフ golden も byte 不変（§1-b / §1-c / §6-b）。
2. **`nfr-budget` が完全な鋳型** — 数値 regex の vacuity guard（単位トークン必須）、`idBlocks` 型の近傍窓、`verdict()` の pass 機械導出、観測レンジ内閾値の根拠コメント様式まで揃っており、第1段はこれの構造的写像として書ける（§2）。ただし母集団の向きが逆である点は設計裁定（§2-a の注記）。
3. **cutoff は `answer-evidence` の `intentDateFromPath` を写す** — 8,503 件の既存コーパスへ遡及適用しないための必須機構。undatable も pre-cutoff で fail-open（§3-a / §8）。
4. **閾値は corpus 実測から導く** — `cid:code-generation:c1-threshold-inside-observed-range` が両側契約（観測最小値 < 閾値 < 観測最大値）を要求。分布が定まらなければ `scope-sizing` 型の「測定のみ・閾値なし」が正当な第1段の形（§4）。
5. **テストは t532 / integration 層 / in-process named export seam** — t514 の三部構成（manifest 両 glob エンジン検証 + 述語 + cutoff 両方向）に corpus sweep を同居させるのが現行規約（§2-e / §9）。

---

## UNMEASURED（3 件 — 下流で確定すべき事項）

| # | 未計測事項 | 影響 |
|---|---|---|
| U-1 | `.claude/sensors/` と core manifest の**内容差**（サイズ差 8 バイトの原因） | 投影面の差分が新センサーにも及ぶかが未確定。実害の有無は投影器の実読で確定できる |
| U-2 | 成果物コーパス内で **measurement ref 様式が実際に使われている出現率** | 第1段の「受理語彙」をこの様式に寄せる妥当性の根拠が未接地（§5-c） |
| U-3 | **数値主張そのものの corpus 内出現分布**（母集団の規模・近傍距離の分布） | 第1段の閾値導出に必須。`cid:code-generation:c1-threshold-inside-observed-range` の両側契約を満たすには**別途スイープが要る** |

---

## 適用範囲外（明示）

第1段の母集団定義（どの数値を「主張」と見なすか）、受理語彙の確定、閾値を置くか測定のみに留めるか、`idBlocks` の export 化可否 — これらはいずれも **requirements-analysis / application-design の所掌**。本 RE は裁定を証拠から下せる状態にすることのみを行った。
