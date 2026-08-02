# Business Logic Model — U1 dag-integrity

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U1 定義(対象 = FR-3+FR-5、変更面 = `amadeus-runtime.ts`(computeBoltDag / compile)・`amadeus-lib.ts`(欠落理由型)・260712 record、規模 production 約 90 行)を本書のロジック境界と変更面の上限として用いた。
- `unit-of-work-story-map.md` の U1 ストーリー「計画の機械投影(bolt_dag)が黙って消えることがない — 消えたら理由つきで止まる」を、後述する「値 / 欠落理由 / 不正」3分岐の設計目的(無音 `undefined` の排除)として据えた。
- `requirements.md` の FR-3(a)(c)・AC-3a / AC-3a2 / AC-3b / AC-3c と FR-5 / AC-5a / AC-5b、および NFR-2(既存 fail-closed の非弱体化)・NFR-3(新規 I/O ゼロ)を、判定表と終了契約の受け入れ条件へ 1:1 で写した。
- `components.md` の C5(`computeBoltDagOutcome`)/ C6(`bolt_dag_absence`)の責務境界(「判定材料は既に読んでいる state のチェックボックスのみ」「消費者を持たないフィールドは置かない」)を、スコープ判定の情報源選定と C6 の消費者確定の制約とした。
- `component-methods.md` の C5 シグネチャと判定表(6行)を canonical とし、本書のフロー記述はその表を実行順へ展開したものに限定した(表そのものの改変はしていない)。
- `services.md` の S3(`compile` の終了契約: 変更後は「units-generation を実行したスコープで artifact が不在または様式不適合なら throw して非ゼロ終了」)を、後述の終了契約節の正本とした。

## 現行フローと欠損点(HEAD 実測)

現行の `compile` は、bolt_dag を作れないとき常に `undefined` を返して node を落とす。

- `.claude/tools/amadeus-runtime.ts:300` `function computeBoltDag(projectDir: string): BoltDag | undefined {`
- `:302` `  if (!existsSync(path)) return undefined;` — ファイル不在。stderr すら書かない完全無音。
- `:305` `  if (!parsed.ok) {` … `:311` `    return undefined;` — parse 失敗。stderr へ advisory は書くが、hook が exit 0 の場合それを読まない。
- `.claude/hooks/amadeus-runtime-compile.ts:210` `  if (result.status !== 0) {` … `:216` `    );` — `recordHookDrop` は**非ゼロ終了時のみ**呼ばれる。現行の compile は parse 失敗でも exit 0 のため、stderr はここで飲まれる。
- `.claude/tools/amadeus-runtime.ts:788` `  const boltDag = computeBoltDag(projectDir);` / `:789` `  if (boltDag) {` — 条件付き append。下流は「units を持たないスコープ」と「dag が欠落した」を区別できない(FR-3(c) の区別不能面)。

欠損は 2 点である。(i) 欠落が理由なく `undefined` に潰れる(値と欠落の判別不能)。(ii) 欠落が「正常な不在」か「不正」かを compile が判断しないため、fail-closed にすべき面が exit 0 で通過する。

## computeBoltDagOutcome のロジックモデル

`computeBoltDag` を、値・欠落理由・不正の 3 アーム判別 union を返す `computeBoltDagOutcome` へ置換する(型定義は domain-entities.md、シグネチャの canonical は `component-methods.md` の C5)。

実行順:

1. `unitDependencyPath(projectDir)`(`.claude/tools/amadeus-lib.ts:4800`)でパスを解決する。
2. `parseCheckboxes(stateContent)`(`.claude/tools/amadeus-lib.ts:5300`)から slug `units-generation` の `state` を引く。`stateContent` が `null`(state 不在)のときは判定材料が無いため `pending` と同等に扱う(不正へ倒さない)。
3. ファイル不在なら、2 の状態で分岐する。`completed` → `invalid("absent")`、`skipped` → `absent("scope-skips-units")`、それ以外 → `absent("units-pending")`。
4. ファイルが在れば `parseBoltDag(body)`(`.claude/tools/amadeus-lib.ts:7931`)を呼ぶ。`ok` なら `dag`。`ok:false` なら `parsed.reason`(`malformed` / `cyclic` / `absent`)と `parsed.detail` をそのまま `invalid` へ載せる — **本 Unit は新しい理由語彙を作らず、既存 `BoltDagParse`(`:7767`)の語彙を再輸出する**。
5. 「書いた以上は様式適合を要求する」(`component-methods.md` C5 判定表の最終行)ため、ファイルが在って parse 失敗のときは units-generation の状態にかかわらず `invalid` とする。寛容側へ倒さない。

`parsed.detail` を捨てずに運ぶことが重要である。`parseBoltDag` は #1893 の 3 構造それぞれに対して異なる `detail` を返す(実測は business-rules.md の BR-U1-9)ため、detail は conductor が是正箇所を特定する唯一の手掛かりになる。

## compile の分岐と終了契約

`:788-791` の `if (boltDag)` を 3 分岐へ置換する。`services.md` S3 の契約に一致させる。

| outcome | graph への反映 | exit |
| --- | --- | --- |
| `dag` | `graph.bolt_dag = outcome.dag`(現行と同一・キー順不変) | 0 |
| `absent` | `graph.bolt_dag_absence = outcome.absence` | 0 |
| `invalid` | 何も append しない(graph を書かない) | **非ゼロ(throw)** |

`invalid` で throw すると、hook 側の `:210` 分岐が初めて真になり `recordHookDrop` へ stderr が残る。手動 `compile` では exit code がそのまま見える。これが「exit 0 + stderr 飲み込み」の閉包経路であり、AC-3a2 の Red(修正前は exit 0)を Green にする唯一の面である。

throw する以上、`invalid` のときは runtime-graph.json を**書かない**。古い graph はディスクに残るが、これは fail-closed 側の挙動として正しい — 不正な計画から作られた新しい graph を下流へ渡さないことが目的である。

## スコープ判定の情報源(実測による選定)

「units-generation を実行したスコープか」を compile が知る手段として、次の 3 候補を実測して比較した。

1. **state のチェックボックス**(採用)— `compile` は `.claude/tools/amadeus-runtime.ts:339` `  const stateContent = readStateFile(projectDir);` で state を**既に読んでいる**。`compile` は `:320` `export function compile(opts: CompileOptions)` から始まり、`:310`–`:800` 区間に他のトップレベル関数宣言は存在しない(`awk` による関数宣言スキャンで確認)ため、`:339` の `stateContent` は `:788` の時点でスコープ内にある。`parseCheckboxes` は runtime.ts が `:38` で import 済み。したがって **新規 I/O はゼロ**(NFR-3 充足)であり、`computeBoltDagOutcome` は `stateContent` を引数で受ける純粋な形にできる(テスト seam が取りやすい)。
2. **scope 名から scope-grid を引く** — grid の読み込みが新規 I/O になり、スコープ定義の変更に追随する結合が増える。不採用。
3. **runtime-graph の既存 stages ノードに units-generation があるか** — graph は今まさに構築中で、`stages` は audit 由来の実行済み行しか持たない。SKIP されたステージは行を持たないため `skipped` と `pending` を区別できない。AC-3b(degrade は無音)を満たせないため不採用。

チェックボックスの状態語彙は `parseCheckboxes` の実装(`:5300`–`:5330`)が返す `completed` / `skipped` / `pending` / `in-progress` / `awaiting-approval` / `revising` の 6 値である。本 Unit が特別扱いするのは `completed`(fail-closed 対象)と `skipped`(degrade 正常系)の 2 値のみで、残り 4 値は `units-pending` へ合流させる。

## FR-5 のデータ変換フロー(#1893 是正)

対象: `amadeus/spaces/default/intents/260712-metrics-observation/inception/units-generation/unit-of-work-dependency.md`。

現物(HEAD 実測)は 3 つの様式逸脱を持つ。`- id: U1`(`:15`/`:17`/`:19`)、`edges:` 節(`:21`–`:27`)、`depends_on: []   # U1 と並行可…`(`:18`)の行末インラインコメント。加えて H2 見出しが 1 個しかない(`## 機械可読 DAG(required-sections センサー要求様式)` のみ)。

変換は「散文の書き換え」ではなく機械可読ブロックを散文 DAG に一致させる方向で行う。

- `- id: X` → `- name: X`
- `edges:` 節を削除(依存関係は `depends_on` が既に表現しており、`edges:` は同じ情報の二重表現である。削除しても散文 `U1 (seam) ──出力契約──> U2 (CLI) ──実行対象──> U3 (CI job)` と `depends_on` の対応は不変)
- `depends_on: []   # …` の行末コメントを除去し、コメント内容は散文側の既存箇条書き(`:7`)が既に保持しているため情報は失われない
- H2 を 1 個追加(散文の依存説明に見出しを与える)して floor ≥2 を満たす

変換後の parse 結果は in-process 実測で `{"ok":true, ..., "batches":[["U1","U2"],["U3"]]}` であり、散文の「W1 = U1 ∥ U2 → W2 = U3」(`:9`)と一致する。`parseUnitsBlock`(`.claude/tools/amadeus-lib.ts:7823`)は無改変(裁定 B)。

## 落ちる実証の注入面

`cid:code-generation:injection-surface-verify`(注入はテストが実際に読む面へ)に従い、面を先に確定する。

- **AC-3a / AC-3a2(fail-closed)**: 注入面は `compile` が読む一時プロジェクトの `unit-of-work-dependency.md` と `amadeus-state.md`。state は `- [x] units-generation — EXECUTE` を持つ fixture(既存 `tests/fixtures/state-construction.md:67` が該当)、artifact は不在(AC-3a)または `- id:` 形の malformed 本文(AC-3a2)。修正前 Red の観測点は **exit code**(現行 0)であり、stderr の有無ではない — stderr は現行でも absent 面には出ないためである。
- **AC-3b(誤発動禁止)**: 同じ artifact 不在に対し `- [S] units-generation` の state を与えて exit 0 かつ `bolt_dag_absence.reason === "scope-skips-units"` を assert する。
- **AC-3c(下流の判別)**: `readBoltDagAbsence` の戻り値を assert する(U2 が消費する面)。本 Unit では graph の当該フィールドの実在と値までを固定する。
- **AC-5a / AC-5b**: 注入ではなく是正の閉包確認。sweep の 38/38 と `required-sections` センサーの pass を実測で示す。

判定ロジック(`computeBoltDagOutcome`)は `stateContent` を引数で受ける全域関数のため in-process import で駆動でき、`cid:code-generation:bun-coverage-spawn-blindspot` に落ちない。exit code の観測が要る面のみ integration 層で spawn する(`cid:code-generation:fs-tests-integration-first`)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T10:11:12Z
- **Iteration:** 1
- **Scope decision:** none

3アーム判定・hook recordHookDrop 発火経路・scope 判定源の実測根拠・ADR-2 消費者・pin 棚卸し・型 canonical を独立再現込みで確認。Minor 2(advisory): degrade×file存在×malformed の corpus ケースを BT で明示追加。

### Findings

- Minor(advisory): degrade スコープ×ファイル存在×malformed の組を FR-6 corpus へ明示ケース化(BT で)。
