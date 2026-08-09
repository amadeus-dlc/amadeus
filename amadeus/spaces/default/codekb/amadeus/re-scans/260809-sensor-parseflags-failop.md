# re-scan: 260809-sensor-parseflags-failop（Issue #2741）

**測定 ref**: observed = 本 worktree HEAD = `origin/main` = `778567dd03b00f22cb887eec06f025557eeaaaf4`
**Base**: `a5621236c`（直前 intent `260807-intent-2328-tests-e2e-au` の observed。`git merge-base --is-ancestor a5621236c HEAD` = **exit 0**、`git rev-list --count a5621236c..HEAD` = **232**。`cid:reverse-engineering:rescan-base-ancestry`）
**Scan mode**: xrev differential scan（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名成立済みの単発 Issue。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
**行番号 currency**: レビュー target SHA ≡ observed（完全一致）。`review..observed` の実 diff が空のため再解決は構造的 no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`。測定区間は `review..observed` に固定）
**副作用**: repo / git / GitHub の状態変更ゼロ。engine 操作ゼロ。coverage 実行ゼロ（`cid:code-generation:c1-coverage-single-owner`）。再現はすべて repo 外 scratch
**tNNN 予約**: 使用済み最大 **t519**（Architect 独立実測 — `ls tests/{unit,integration,e2e,smoke} | grep -oE '^t[0-9]+' | sort -u | sort -n | tail`）、新規は **t520** 以降

---

## 検索述語（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review`（E-ASD-RES13 追補 — 述語をそのまま再実行できる形で結果と同所に置く）に従う。

| ID | 述語 | 結果 |
|---|---|---|
| P1 | `grep -rn "function parseFlags" packages/ scripts/` | 15 hit |
| P2 | `grep -rnE '\[\+\+(i\|idx\|index)\]' packages/ scripts/ tests/` | 55 hit |
| P3 | `grep -rnE '\[(i\|idx\|index) \+ 1\]' packages/framework/core/tools/ scripts/`（非 test） | 80 hit ← **P2 が構造的に取りこぼす変種** |
| P4 | `grep -rn "expects a value" packages/ tests/` | house idiom 5本 + t31 の2 assert |

P2 単独では `args[i+1]; i++` 形（同一欠陥・別イディオム）を取りこぼす。`cid:application-design:c1-asd-multi-idiom-inventory`（同一データ構造への複数アクセス形式を検索キーに含める）の実例。

---

## 1. 患部の現況（observed で verbatim 確認）

### 1-a. 3センサーの `parseFlags` — 同型・逐語一致

| ファイル | 行 | 形 |
|---|---|---|
| `packages/framework/core/tools/amadeus-sensor-depth-budget.ts` | **294-302** | `out.depth = argv[++i]`（3フラグ） |
| `packages/framework/core/tools/amadeus-sensor-question-budget.ts` | **340-348** | 同上（3フラグ・逐語同一） |
| `packages/framework/core/tools/amadeus-sensor-nfr-budget.ts` | **1031-1040** | 同上 + `--kind`（4フラグ） |

Issue #2741 本文の逐語引用は depth-budget:294-302 と**完全一致**（CONFIRMED）。

### 1-b. 決定的再現（scratch、exit code は非パイプで取得 — `cid:code-generation:no-exit-capture-through-pipe`）

**depth-budget、over-budget fixture（3,940 B / FR-1 1件）**:

```
A) --output-path F --depth Minimal → {"pass":false,"findings_count":1,...,"reason":"minimal",
     "findings":[{"field":"bytes-per-fr","reason":"3940 B over 1 requirements exceeds the Minimal guidance of 1800 B per FR"}]}  exit=0
B) --output-path F --depth        → {"pass":true,"findings_count":0,"reason":"no-depth",...,"bytes_per_fr":0}  exit=0
C) --output-path F                → （B と cmp で BYTE-IDENTICAL）                                            exit=0
D) --output-path --depth Minimal  → {"pass":true,...,"reason":"not-requirements","fr_count":0,"bytes":0}       exit=0
```

**A が検出する finding を B が無言で消す** — レビュアー2名の「B/C バイト一致」より一段強い証拠（検出可能な違反が実際に握り潰される）。D は完全サイレント。

**nfr-budget（最決定的 — 測定値そのものが変わる）**:

```
N1) --depth Minimal --kind service → "unit_kind":"service","missing_kind_required_count":4   exit=0
N2) --kind --depth Minimal         → "unit_kind":"--depth","missing_kind_required_count":2   exit=0
N3) --depth --kind service         → "unit_kind":null,     "missing_kind_required_count":0   exit=0
```

**question-budget**: `--depth Minimal` → `"reason":"within-budget","depth":"Minimal","ceiling":4` / `--depth`（末尾）→ `"reason":"no-depth","depth":null,"ceiling":null`、いずれも exit 0。

### 1-c. scope-sizing のガードと残渣

`amadeus-sensor-scope-sizing.ts:247-260`（`valueAt` + 逐語コメント）実在確認。実測:

```
--output-path --depth Standard → amadeus-sensor-scope-sizing: --output-path is required   exit=1  ← 封鎖済み
--output-path P --depth        → {"pass":true,...,"depth":null}                            exit=0  ← 残渣
```

**残渣の正体**: `valueAt(argv, ++i)` は `++i` を副作用として実行するため、**次フラグは値化されないが飲み込まれる**。必須フラグの場合のみ後段 `fail()` で偶然 loud、任意フラグは静かに `undefined`。

### 1-d. dispatcher は構造的に安全（CONFIRMED）

- `amadeus-sensor.ts:886-898` `depthBudgetArgs` → `return depth === undefined ? [] : ["--depth", depth];`
- `amadeus-sensor.ts:900-926` `unitKindArgs` → `return kind === undefined ? [] : ["--kind", kind];`

値なしフラグは発火経路で構造的に発生不能。**dispatcher 自身の `parseFlags`（`amadeus-sensor.ts:179-195`）は両アーム loud** — 「dispatcher は loud、dispatch される側は silent」の非対称は事実。

---

## 2. 裁定事項 (a)(b)(c) の設計入力

### (a) 修正スコープ候補の対象目録（observed 実測）

| クラス | 所在 | 現況（実測） |
|---|---|---|
| **T1 コア3本** | depth-budget:294-302 / question-budget:340-348 / nfr-budget:1031-1040 | 両アーム silent、exit 0。**最悪ケース**（受け皿なし） |
| **T2 scope-sizing 残渣** | scope-sizing:247-260 | アームB封鎖済み・アームA残渣（`depth:null`） |
| **T3 センサー・偽 green** | required-sections:67-87 | **完全偽 green を実測再現**（下記） |
| **T4 センサー・偶然 loud** | answer-evidence:95-106 / pr-convergence-report-format:166-173 | parse 欠陥は同一、下流の必須チェックで偶然 exit 1 |
| **T5 意図宣言済み例外** | upstream-coverage:19-35（`:29-30` 逐語コメント） | `--consumes` 末尾 = 空リストと**同一扱いを意図宣言**。一律修正は意図破壊 |
| **T6 別イディオム・両アーム loud** | linter:93-119 / type-check:112 以降 | **実測 exit 1 ×4**（下記） — reviewer-2 の「より無音な変種」は**誤り** |
| **T7 汎用 `parseFlags`（センサー外）** | learnings.ts:858-867 / jump.ts:238-244 / **state.ts:705-715** / **state.ts:5029-5036** | 末尾フラグは無言ドロップ、次フラグは値として受理 |
| **T7b 名前指定フラグ変種**（Architect 追加、下記 §5-a） | jump.ts:192-194 / state.ts:732-739 / state.ts:4653-4656 / state.ts:4788-4795 | 同一欠陥形だが**対象は名指しフラグのみ**。射程が狭く重大度は別評価 |

**T3 実測**（reviewer-2 の主張を独立再現）:

```
RS-A) --templates-dir T --template-eligible requirements
      → {"pass":false,...,"template":"applied","template_missing":["## Gamma"]}   exit=0
RS-C) --templates-dir --template-eligible requirements
      → {"pass":true,"h2_count":3,"findings_count":0}                             exit=0  警告なし
```

テンプレート違反1件が**警告も非0 exit も伴わず消える**。本 Issue の3本より重い。

**T6 実測（reviewer-2 訂正）**: `linter --stage x --file-path`（末尾）→ **exit 1**、`linter --stage --file-path /tmp/x.ts` → **exit 1**、type-check も両アーム **exit 1**。機序 = `?? ""` の後に `if (!stage) exit(1)`（linter:110-117）と、未知トークンへの `else { unknown flag → exit 1 }`（linter:104-107）。→ **T6 は欠陥クラスから外してよい**（メッセージ誤帰属の質は残る — アームB で `unknown flag: /tmp/x.ts`）。

**T7 の広さ**: reviewer-2 の述語 `[++i]` は `args[i+1]; i++` 形を構造的に取りこぼす。P3 で `amadeus-state.ts` の**2箇所**が追加で現れた。しかも同一ファイル `amadeus-state.ts:4076-4087` には house idiom（`getFlagValue`、逐語コメント「silently wrong. This helper errors cleanly when the value starts with `--`」）が実装済み — **1ファイル内の非対称**。

### (b) canonical 化の実装制約 — **self-contained 制約は障害にならない**（重要）

`amadeus-sensor-depth-budget.ts:23-24` 逐語:

> `// Self-contained (no amadeus-lib import): a per-sensor script is spawned by the`
> `// dispatcher and must not drag the library's module graph into that process.`

**制約の射程は「amadeus-lib を import しない」であって「import しない」ではない**。実測根拠3点（事実）:

1. **他センサーは amadeus-lib を import している**: `amadeus-sensor-invocation.ts:8` / `answer-evidence:19` / `schema:33` / `upstream-coverage:2` / `required-sections:3` / `type-check:90` の**6本**（Architect 再列挙 — Developer scan の4本を訂正。§5-b）。制約は per-sensor スクリプト全体の規約ではなく、**budget 系のローカル方針**。
2. **cross-sensor import の現役先例が対象内にある**: `amadeus-sensor-nfr-budget.ts:76` `import { canonicalDepth } from "./amadeus-sensor-depth-budget.ts";` — 3本のうち1本が既に兄弟センサーから import している（Architect verbatim 再確認）。
3. **配布面は自動**: `packages/framework/harness/*/manifest.ts` の `coreDirs` は `{ src: "tools", dst: "tools" }`（claude:56）で `walk(srcDir)` の全ファイルを投影 → core/tools への**新規小モジュール追加は全ハーネスへ自動で乗る**（手動同期不要）。

→ **設計選択肢**（仮説ではなく事実からの帰結）:

- **B1** 新規 `amadeus-sensor-argv.ts`（依存 = なし）を core/tools へ置き、対象センサーが import。self-contained 制約に抵触しない。T5 の意図的寛容は `{ allowEmpty: true }` 相当の明示 opt-out で表現可能。
- **B2** `scope-sizing.ts` の `valueAt` を export し兄弟が import（先例 2 と同型・最小差分）。ただし scope-sizing がハブ化する所有の歪み。
- **B3** ファイル内複製（現状 idiom の踏襲）。canonical 1定義の要求（完了条件2）を満たさない。

参考: `amadeus-lib.ts:218-229` の `stripProjectDir` は「兄弟ツールの共有 CLI 契約」として既に共有 argv ヘルパーの前例だが、amadeus-lib 所属なのでセンサーからは使えない。

### (c) スコープ拡大時の重大度材料

- **required-sections の完全偽 green は再現済み**（上記 RS-C）。dispatcher `amadeus-sensor.ts` が対で push するため発火経路では非発現 → S 引き上げの根拠は「潜在の質」であって「現発現」ではない。
- **bootstrap 遡及**: 3センサーの導入は `fa5635f4f`（#2503 depth-budget）/ `2ef827c46`（#2699 nfr）/ `37f1c20f8`（#2712 question）で、いずれも base..observed 区間内 → **3センサーに `origin:bootstrap` は不適**。required-sections を含める場合のみ bootstrap 遡及が発生（reviewer-2 の `5cfb16165` 主張は本 scan では未再検証 — **仮説**）。
- **T7 / T7b（state/learnings/jump）は sensor ではなく engine 系 CLI** — 実発現面が異なるため、含めるなら S 再判定が必要。本 scan では発現有無を未実測（仮説）。

---

## 3. テスト面の現況

| テスト | 内容 | 修正への含意 |
|---|---|---|
| `tests/integration/t519-scope-sizing-sensor.integration.test.ts:254-267` | **「a flag written without a value is missing, not a value of `--depth`」** — spawn で exit 1 + stderr + `stdout === ""` を assert | **移植すべき正本テスト**。`:275-306` に in-process（`fail` export）版があり lcov 可視 |
| `tests/unit/t31.test.ts:223-244` | house idiom の両アーム（`expects a value`）を assert | 文言の先例 |
| `t488-depth-budget-sensor.integration.test.ts:688-693` | **「--depth is optional; without it the sensor passes fail-open」**（`--depth` **完全省略** → `pass:true` / `reason:"no-depth"`） | **ピン留めは「省略」のみ。「値なし」は無ピン** → 値なしを loud 化しても本テストと衝突しない（`cid:reverse-engineering:c1-pinned-behavior-ruling` の適用外） |
| `t488:695-703` | 「a missing flag is the only exit-1 path, and it names the flag」 | **これは明示改訂が必要**（loud rejection が2つ目の exit-1 経路になる） |
| `t514-nfr-budget-sensor.integration.test.ts:645-651` | `--depth` 省略時の fail-open をピン | 同上（省略のみ） |
| `t517-question-budget-sensor.integration.test.ts:320-330` | 必須フラグ欠落の exit 1 | 追加テストの置き場所 |

**in-process seam の現況**: `main` は4本とも export 済み（depth-budget:311 / question-budget:357 / nfr-budget:1054 / scope-sizing:275）。`fail` は **scope-sizing:266 のみ export**、他3本は非 export（depth-budget:304 / question-budget:350 / nfr-budget:1042）→ t519 と同じ in-process falling-proof を他3本で書くには `fail` の export 化が要る（`cid:requirements-analysis:bun-coverage-spawn-blindspot`）。

---

## 4. base..observed 区間で患部に触れたコミット

`git log --oneline a5621236c..778567dd0 -- <患部11ファイル>` → **10件**（exit 0）:

```
58b780210 #2738 scope-sizing 新設（valueAt ガード付き）
4f460f305 #2725 nfr-budget kind 剪定
a893b0c3c #2721 nfr-budget 数値閾値
9d631aa23 #2715 nfr-budget Standard 閾値
37f1c20f8 #2712 question-budget 新設
2ef827c46 #2699 nfr-budget 新設
1bca89a89 #2673 depth-budget FR カウント
c773961cf #2540 depth-budget FR ID
4b03b86e1 #2525 depth-budget 閾値
fa5635f4f #2503 depth-budget 新設
```

`amadeus-sensor.ts` / required-sections / upstream-coverage / answer-evidence / learnings / jump は**区間内で無変更**。→ 3センサーは全て区間内で新設・改修されており、**「様式の複製が区間内で3回起きた」という Issue の因果は commit 列で裏づけられる**。

---

## 5. Architect 独立スポット再実測（Developer scan の二重化）

conductor 指示の3点をいずれも observed 断面で独立に再実測した。**3点とも scan の主張を確認**し、加えて**2件の列挙差**を検出した。

### 5-a. (i) T7 の所在 — CONFIRMED、かつ **T7b を追加検出**

述語 P3 を `amadeus-state.ts` / `amadeus-learnings.ts` / `amadeus-jump.ts` の3ファイルへ適用（exit 0）:

```
jump.ts:194      projectDir = rawArgs[i + 1];
jump.ts:240      flags[args[i].slice(2)] = args[i + 1];
learnings.ts:863 flags[a.slice(2)] = args[i + 1];
state.ts:710     flags[a.slice(2)] = args[i + 1];
state.ts:733     intent = args[i + 1];
state.ts:738     space = args[i + 1];
state.ts:4082    const val = args[idx + 1];      ← house idiom（getFlagValue、ガード有）
state.ts:4655    choice = args[i + 1];
state.ts:4789    eventTypeArg = args[i + 1];
state.ts:4792    const kv = args[i + 1];
state.ts:5033    flags[a.slice(2)] = args[i + 1];
```

**汎用 `parseFlags` 形（任意の `--*` が次トークンを無条件に飲む）は scan の主張どおり4箇所**: `jump.ts:238-244` / `learnings.ts:858-867` / `state.ts:705-715` / `state.ts:5029-5036`（`handlePracticesPromote` のインライン loop）。**T7 = 4箇所は CONFIRMED**。

**追加検出（T7b、scan の T7 に不在）**: 同一欠陥形だが**名指しフラグ限定**の変種が4箇所ある。ガード条件はいずれも `args[i] === "--x" && i + 1 < args.length` のみで、**次トークンが `--` 始まりかを検査しない**。

| 所在 | 対象フラグ | 実測した性質 |
|---|---|---|
| `jump.ts:192-194` | `--project-dir` | `--project-dir --foo` → projectDir = `"--foo"` |
| `state.ts:732-739`（`extractIntentSelector`） | `--intent` / `--space` | `--intent --space X` → intent = `"--space"` |
| `state.ts:4653-4656`（`handleAcknowledgeCompaction`） | `--choice` | `--choice --foo` → choice = `"--foo"`（**非空のため後段 `if (!choice) error()`:4659 を通過** — 偶然 loud にならない） |
| `state.ts:4788-4795` | `--type` / `--field` | 同型 |

**射程の差**: T7 は「任意フラグが次を飲む」ため誤消費の組合せが argv 全体に開くのに対し、T7b は名指しフラグの後続1トークンに限られる。したがって**重大度は同一ではなく、スコープ裁定では別クラスとして扱うべき**。本 scan では T7b の**実発現有無は未実測（仮説）**。

`state.ts` は 1ファイル内に house idiom（`getFlagValue:4076-4087`、`--` 始まりを明示拒否）と T7・T7b が**同居**しており、非対称は scan の指摘どおりかつ scan より広い。

### 5-b. (ii) self-contained 制約の非障害性 — CONFIRMED、かつ **前例が scan より2本多い**

- `amadeus-sensor-nfr-budget.ts:76` `import { canonicalDepth } from "./amadeus-sensor-depth-budget.ts";` — **verbatim 再確認、cross-sensor import の現役先例は実在**。
- `amadeus-sensor-depth-budget.ts:23-24` の self-contained コメントも verbatim 再確認。同ファイルの import は `node:fs` / `node:path` のみ（:25-26）で、制約は文言どおり **amadeus-lib 限定**。
- amadeus-lib を import する per-sensor スクリプトは **6本**（scan 報告の4本に `amadeus-sensor-invocation.ts:8` と `amadeus-sensor-schema.ts:33` が追加）。述語 `grep -rn 'from "./amadeus-lib' packages/framework/core/tools/amadeus-sensor-*.ts`。**結論（制約は budget 系のローカル方針）は不変で、むしろ強化される**。

### 5-c. (iii) t488 のピン内容 — CONFIRMED（verbatim）

`sed -n '685,710p' tests/integration/t488-depth-budget-sensor.integration.test.ts` の実出力:

- `:688-693` — `test("--depth is optional; without it the sensor passes fail-open", ...)`。呼び出しは `run(["--stage", "requirements-analysis", "--output-path", p])` で **`--depth` を argv から完全に省略**。assert は `code === 0` / `{ pass: true, reason: "no-depth" }`。→ **「値なしフラグ」は本テストの射程外**。scan の主張 CONFIRMED。
- `:695-703` — `test("a missing flag is the only exit-1 path, and it names the flag", ...)`。テスト**名に "the only exit-1 path" を含む**ため、loud rejection の追加は名と assert の両面で明示改訂が要る。scan の主張 CONFIRMED。

### 5-d. tNNN — CONFIRMED

使用済み最大 **t519**（`t517` / `t518` / `t519` が上位3件）、新規は **t520** 以降。`reverse-engineering-timestamp.md` 直前節の「次は t484」は**陳腐化**（scan の指摘どおり）。

---

## 6. 事実と仮説の分離

**事実（実測・再現済み）**:

- 3センサーの両アーム silent fail-open。**over-budget の finding が無言で消える**ことまで実証（レビュー verdict より強い証拠）
- required-sections の完全偽 green（RS-C）
- **self-contained 制約は canonical 化の障害ではない** — 同一制約下の nfr-budget が既に兄弟センサーから import しており、配布面も `coreDirs` walk で自動。裁定 (b) は「できるか」ではなく「どこに置くか」の選択問題
- t488:688 / t514:645 がピンしているのは **`--depth` の完全省略**であり、値なしフラグではない → 値なし loud 化は既存ピンと非衝突。**改訂が要るのは t488:695-703 の1本**
- **linter / type-check は両アーム exit 1**（reviewer-2 の「より無音な変種」は誤り）
- **T7（汎用 parseFlags）は 2箇所ではなく4箇所**（state.ts:705 / :5029 が追加）
- **T7b（名指しフラグ変種）が4箇所実在**（Architect 追加検出。jump.ts:192 / state.ts:732 / :4653 / :4788）
- `fail` の export は scope-sizing:266 のみ

**仮説・未実測として引き継ぐもの**:

- required-sections の同型が bootstrap commit `5cfb16165` に遡及するか（reviewer-2 主張、本 scan 未検証）
- T7 / T7b（state/learnings/jump）の**実発現有無**（呼出し元の argv 構成が値なしフラグを生みうるか）。T7b は誤消費の射程が狭いぶん発現条件も狭い可能性があるが未実測
- `?? ""` 変種のうち upstream-coverage 以外に意図宣言があるか（逐語コメント確認は upstream-coverage:29-30 の1件のみ）

**裁定の材料として最も効く1点**: `fail` の export が scope-sizing にしかないため、**修正スコープと in-process falling-proof の書きやすさが連動する**。T1 3本を対象にするなら `fail` export 化（3ファイル）が同時に必要で、これは t519:275-306 の既存様式の機械的移植として実装できる。

**Requirements Analysis へ送る裁定候補**:

1. 修正スコープ — T1 のみ / T1+T2 / T1+T2+T3 / T7・T7b を含むか（S 再判定を伴う）
2. canonical 化の置き場所 — B1（新規 `amadeus-sensor-argv.ts`）/ B2（scope-sizing の `valueAt` export）/ B3（複製維持、完了条件2を満たさない）
3. T5（upstream-coverage の意図的寛容）の表現 — 明示 opt-out か対象外か
4. t488:695-703 の改訂形（テスト名 + assert の両面）
5. `fail` export 化の範囲（T1 3本か、対象スコープに追随か）
6. T7b を独立クラスとして扱うか T7 に統合するか（射程と重大度が異なる）

---

## 7. codekb 差分リフレッシュの反映範囲

- `reverse-engineering-timestamp.md` — 本 intent の実行メタデータ節を新設、直前2節（`260807-intent-2328-tests-e2e-au` / `260807-stage-perf-report`）の「現在」マーカーを履歴ラベルへ降格（`cid:reverse-engineering:c3-relabel`）
- `component-inventory.md` — 「per-sensor argv parse の所在と現況」節を追加（T1〜T7b 表 + house idiom の所在、観測 ref 明記 — `cid:reverse-engineering:measurement-ref-in-artifacts`）
- `code-structure.md` / `architecture.md` は**変更不要**（構造は不変、患部は既存コンポーネント内）
