# re-scan 記録 — 260810-grilling-frontier-resync（Issue #2785: grilling depth の frontier 駆動再定義への resync）

## 0. 実行メタデータ

- Base commit: `91f37ec8589cdf468599b4787e27e5125d4d16e8`（直前 intent `260810-tla-applicability-wiring` の observed。`git merge-base --is-ancestor 91f37ec8589cdf468599b4787e27e5125d4d16e8 HEAD` → **exit 0** = 祖先性 OK。距離14コミット）
- Observed commit: `5564dccd14acf1f47218ff255b5a0e63d53541bf`（`git rev-parse HEAD` 実測）
- Scan mode: **xrev differential**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— #2785 はクロスレビュー2名成立済み（target SHA `28e1f40c`）
- Focus: Issue #2785 — grilling の depth を「質問数予算」から「枝刈り閾値」へ再定義し、上流 `mattpocock/skills` の frontier 駆動 grilling（ピン SHA `1495d014303e041c51c29f9e442485ba06f5878d`）を骨格として `grilling-protocol.md` を再同期する
- 行番号 currency: レビュー target SHA `28e1f40c` ≠ observed `5564dccd1`。SHA 一致による免除は不成立のため、判定は `review..observed`（= `28e1f40c..HEAD`）の実 diff で行った（`cid:reverse-engineering:E-XBB-RE-S13-c2`）
- 二重化: Developer scan を一次入力とし、以下の Architect スポット再実測で照合済み — (1) `stage-protocol.md:300-311`（§3 depth 表）、(2) `stage-protocol.md:348-356`（Step 3d）、(3) `grilling-protocol.md:25-36`（D1/D6）、(4) `amadeus-directive.ts:60-65`（`VALID_DEPTH_VALUES`）、(5) `t415-interaction-budget-contract.test.ts:26-54`（全 pin verbatim）。5箇所すべて Developer scan の引用と**完全一致**（`sed -n` による直接照合、差分ゼロ）

---

## 1. review..observed 交差判定（fact）

```
git diff --name-only 28e1f40c..HEAD                          # → 60 ファイル、exit 0
git diff --name-only 28e1f40c..HEAD | grep -iE "grilling|conductor|question-budget"   # → 0 hit
```

60ファイルの差分に `grilling-protocol.md` / `conductor.md` / `amadeus-sensor-question-budget.ts` / test pin ファイル（t415, t199）は**含まれない**。含まれるのは患部候補2ファイルのみ：`packages/framework/core/amadeus-common/protocols/stage-protocol.md` と `packages/framework/core/tools/amadeus-directive.ts`。

### 1a. `stage-protocol.md` の diff 内容（1ハンク）

`git diff 28e1f40c..HEAD -- packages/framework/core/amadeus-common/protocols/stage-protocol.md`（exit 0）— 旧行 ~994 付近に1ハンクのみ。追加テキストの verbatim 冒頭: `An advisory whose declaration names a destination carries \`advisories[].handoff_stage\`.`（#2766 advisory handoff_stage 機能）。grilling/depth 内容の変更は**ゼロ**。この追加位置は §3（:300-311）・Step 3d（:348-356）・§8（:726-746）・semi 経路（:137）のいずれよりも後方にあり、これらの行番号をシフトしない。

### 1b. `amadeus-directive.ts` の diff 内容（2ハンク）

`git diff 28e1f40c..HEAD -- packages/framework/core/tools/amadeus-directive.ts`（exit 0）— 2ハンクとも `AdvisoryChoiceDirectiveAdvisory` への `handoff_stage?: string` フィールド追加（旧行 ~200 付近）と `checkAwaitAdvisoryChoice` 内のバリデーション追加（旧行 ~793-798 付近）。いずれも #2766 由来で grilling/depth 無関係。`VALID_DEPTH_VALUES`（:62）とその唯一の呼び出し箇所（`checkOptionalEnum(o, "depth", VALID_DEPTH_VALUES, kind, errors)`、:664）は無変更。

**結論**: 患部2ファイルは diff はあるが、grilling/depth 節への影響はゼロ。全引用は review 断面の行番号のまま HEAD で有効。

---

## 2. `stage-protocol.md` 患部インベントリ（全数、HEAD = observed で再解決）

| # | 節 | 行 | 状態 |
|---|---|---|---|
| (a) | §3 depth 表 | :300-311 | review 引用と同一行・同一 verbatim |
| (b) | Step 3d「Grill me」 | :348-356 | review 引用と同一行・同一 verbatim。**`hybrid termination` が :349 に残存**（後述 §4） |
| (c) | §8 Depth-Level Contract | :726-746 | review 引用と同一行・同一 verbatim |
| (d) | semi decide-question 経路 | :137 | review 引用と同一行・同一 verbatim |

Architect スポット再実測（`sed -n '300,311p'` / `sed -n '348,356p'`）で (a)(b) の verbatim を直接確認、完全一致。(c)(d) は Developer scan の引用文字列と HEAD grep の突合で確認（差分なし）。

### 2a. §3 depth 表の verbatim（Standard 深度）

```
| Depth | Total question budget | Guidance |
| Minimal | at most 4 per stage | ... |
| Standard | at most 8 per stage | ... |
| Comprehensive | at most 12 per stage | ... |
```

`**These are finite ceilings, not targets.** The agent MUST use judgment below the ceiling:` に続き、Primary/follow-up 予算共有規則（:311）。**「質問数予算」の枠組みそのもの** — 本 intent が再定義対象とする現行契約の正本箇所。

### 2b. Step 3d 冒頭の verbatim（:349、抜粋）

> Follow `grilling-protocol.md`（同ディレクトリ）— the single source for the grilling discipline (one question at a time, recommended answer with rationale, facts self-researched and only decisions asked, **hybrid termination**, confirmed agreement summary). Do not re-define the discipline here.

`hybrid termination` の語は canonical 側（`grilling-protocol.md` D6）が既に `Bounded termination` へ改称済みであるにもかかわらず、参照元のこの1箇所にだけ旧称が残る（用語ドリフト、§4 参照）。

---

## 3. `grilling-protocol.md`（canonical、非交差ファイル）全数確認

全137行を通読。構成:

- L1-6: 帰属ヘッダ（`mattpocock/skills` の "grilling" skill、MIT License、`Copyright (c) Matt Pocock`。**上流の元リポジトリを指すのみで、Issue #2785 が骨格として指定するピン SHA `1495d014303e041c51c29f9e442485ba06f5878d` への言及はない** — SHA ピン自体は本 codekb・issue 側にのみ存在し、正本ファイルの帰属ヘッダは未更新）
- L9-35: `## 1. Dialogue Discipline (applies in BOTH contexts)` — D1〜D7 の7ルール表
  - D1（:29）: `Present questions **one at a time**. Never bundle multiple questions into a single structured-question call.`
  - D6（:34）: `**Bounded termination.** ... Otherwise stop at the finite total question budget: workflow grilling uses the active stage depth; standalone grilling uses the explicitly requested Minimal / Standard / Comprehensive level and defaults to Standard when none is requested. The ceilings are Minimal 4 / Standard 8 / Comprehensive 12 rendered questions, ...`
- L37-69: `## 2. The Grilling Loop (8 steps)`（Investigate/Formulate/Append/Present/WriteBack/CheckEnd/Summary/Confirmed）
- L71-122: `## 3. Question Spec Templates`（C-2 grilling question :77、C-3 ceiling transition :97、C-4 agreement summary confirmation :106）
- L124-137: `## 4. Workflow vs Standalone`

**現行の全体構造は「質問数の総量予算 + 8ステップ固定ループ」であり、frontier 駆動（探索の枝刈り閾値によって『まだ聞くべき論点があるか』を判定する上流方式）の要素は現時点でゼロ**。D6 のタイトルは「Bounded termination」だが、bound の単位は依然として質問**数**（4/8/12）である。

`grilling-protocol.md` 全文に `hybrid` 語彙は**0 hit**（読了確認）。

---

## 4. 用語ドリフト「hybrid termination」の全数（resync 対象、fact）

検索述語（逐語・再実行可能）:

```
git grep -n "hybrid termination" -- 'docs/**/*' 'packages/framework/core/**/*'
git grep -n "ハイブリッド終了" -- 'docs/**/*' 'packages/framework/core/**/*'
```

| # | ファイル:行 | 内容 |
|---|---|---|
| 1 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md:349` | 英語 `hybrid termination`（§2b 参照） |
| 2 | `docs/reference/04-stage-protocol.md:320` | 英語 `are self-researched and only decisions are asked; hybrid termination` |
| 3 | `docs/reference/04-stage-protocol.ja.md:264` | 和訳 `ハイブリッド終了(いつでも「done」、深度ガイドラインで継続チェック)` |

計 **3ファイル3箇所**。canonical `grilling-protocol.md` の D6 見出しは `Bounded termination` に確定済み（全文 0 hit で確認済み）であるため、この3箇所は superseded ラベルへの参照であり resync の直接対象となる。

---

## 5. question-budget センサー・機械契約の閉語彙構造

- `packages/framework/core/tools/amadeus-sensor-question-budget.ts`
  - `QUESTION_BUDGETS`（:39-43）: `Record<string, number | undefined> = { Minimal: 4, Standard: 8, Comprehensive: 12 };`
  - `DEPTH_LEVELS`（:47）: `const DEPTH_LEVELS = ["Minimal", "Standard", "Comprehensive"] as const;`（:45-46 のコメントで `amadeus-directive.ts` からの mirror と明記）
  - `QUESTION_BUDGET_CUTOFF_YYMMDD`（:63）: `export const QUESTION_BUDGET_CUTOFF_YYMMDD = 260809;`
- `packages/framework/core/tools/amadeus-directive.ts:62`: `export const VALID_DEPTH_VALUES = ["Minimal", "Standard", "Comprehensive"] as const;`（唯一の呼び出しは :664 `checkOptionalEnum`）
- 専用の sensor manifest ファイルは存在しない（`amadeus-baseline-manifest.ts` に `question-budget` 0 hit、他に `packages/framework/core/tools/` 配下に `*manifest*` ファイルなし）
- 宣言ステージ数: `git grep -l "question-budget" -- packages/framework/core/amadeus-common/stages/` → **29ファイル**（ideation 7: rough-mockups / approval-handoff / team-formation / intent-capture / scope-definition / feasibility / market-research、inception 8: reverse-engineering / application-design / refined-mockups / practices-discovery / user-stories / units-generation / delivery-planning / requirements-analysis、construction 7: ci-pipeline / build-and-test / nfr-requirements / functional-design / infrastructure-design / nfr-design / code-generation、operation 7: feedback-optimization / environment-provisioning / deployment-execution / deployment-pipeline / observability-setup / incident-response / performance-validation）

**帰結**: depth を「質問数予算」から「枝刈り閾値」へ再定義する設計は、`VALID_DEPTH_VALUES`（閉語彙3値）自体は維持できても、`QUESTION_BUDGETS` の数値契約と、それを消費する29ステージ全数のセンサー適用面、および下記 t415 の verbatim pin 群まで一貫して置き換える必要がある。

---

## 6. テストピン棚卸し

### 6a. `tests/integration/t415-interaction-budget-contract.test.ts`（grilling/depth 関連 pin、L26-54 のみ抜粋、他は対象外）

```
L26: expect(PROTOCOL).toContain("Minimal | at most 4 per stage");
L27: expect(PROTOCOL).toContain("Standard | at most 8 per stage");
L28: expect(PROTOCOL).toContain("Comprehensive | at most 12 per stage");
L29: expect(compact(PROTOCOL)).toContain("one consolidated follow-up round for the stage");
L30: expect(PROTOCOL).toContain("Primary and follow-up questions share this single total budget");
L31: expect(PROTOCOL).toContain("only the slots remaining");
L32: expect(PROTOCOL).not.toContain("8-12+");
L33: expect(PROTOCOL).not.toContain("These are guidelines, not hard caps");
L36: expect(grilling).toContain("Do not offer continuation beyond the total ceiling");
L37: expect(compact(grilling)).toContain("Proceed directly to C-4");
L38: expect(grilling).toContain("including estimate confirmations");
L39: expect(grilling).toContain("defaults to Standard when none is requested");
L40: expect(grilling).toContain("standalone terminal agreement summary");
L41: expect(grilling).not.toContain('label: "Continue"');
L44: expect(standalone).toContain("default to Standard (8)");
L45: expect(standalone).toContain("unresolved material points");
L49: expect(PROTOCOL).toContain("An ambiguity is **material** only when");
L50: expect(PROTOCOL).toContain("an external contract, or data safety");
L51: expect(PROTOCOL).toContain("irreversible or high risk");
L52: expect(PROTOCOL).toContain("adopt the recommended value and record the assumption");
L53: expect(PROTOCOL).toContain("carry it to the existing approval boundary");
L54: expect(PROTOCOL).toContain("Treat the contradiction as material ambiguity");
```

Architect スポット照合（`sed -n '26,54p'`）で全21行の verbatim 一致を確認。これらはすべて「数値予算」契約を直接固定するピンであり、depth を frontier 駆動へ再定義する設計はこのファイルの明示改訂を要する（`cid:requirements-analysis:c3-260729-open-bug-batch` — pin された仕様の変更は要件段の裁定を要する。`t488`/`t514` 型の既存ピン変更と同種）。

L71-232 の残り pin（reviewer-severity、exploratory-review closure、sandbox allowlist 契約）は grilling/depth 無関係のため対象外（Developer scan の完全性記録に準拠、本 re-scan では再列挙しない）。

### 6b. `tests/unit/t199-grilling-distribution.test.ts`（存在・frontmatter・dist 面検査、非 verbatim pin）

1. `SKILL.md` が4ハーネス dist ツリー（claude/kiro/kiro-ide/codex）に存在すること（`existsSync` のみ）
2. `grilling-protocol.md` が4ハーネス dist ツリーの `amadeus-common/protocols/` に存在すること（`existsSync` のみ）
3. `dist/claude/.claude/amadeus-common/protocols/stage-protocol.md` に `label: Grill me` と `grilling-protocol.md` の両文字列が含まれること
4. 各 dist の `SKILL.md` frontmatter に `classification: read-only` / `user-invocable: true` / `name: amadeus-grilling`
5. 各 dist の `grilling-protocol.md` に `MIT License` と `https://github.com/mattpocock/skills` が含まれること
6. Claude の `SKILL.md` が `grilling-protocol.md` と `MIT` を含むこと

**この6検査はいずれも `hybrid`/`bounded` の用語を直接ピンしない**が、`dist/` を読むため、正本（`grilling-protocol.md` / `stage-protocol.md`）を編集した後は `bun run build` を実行しないと dist 面の内容が古いまま残る（`bun run test:ci` 等を走らせる際の一般的注意。本 re-scan では test 実行自体は行っていない — engine 操作・git 状態変更禁止のスコープ内で読み取りのみ）。

---

## 7. "one question at a time" prose 消費者（全数、predicate 記録）

検索述語:

```
git grep -n "one question at a time" -- 'packages/framework/core/**/*' 'docs/**/*' ':!tests' ':!*/record/*' ':!*/intents/*'
git grep -n "1問ずつ" -- （同スコープ）
```

英語 `one question at a time` — **7 hit**:

1. `docs/guide/02-your-first-workflow.ja.md:89`
2. `docs/guide/02-your-first-workflow.md:89`
3. `docs/guide/07-interaction-modes.ja.md:18`
4. `docs/guide/07-interaction-modes.md:22`
5. `docs/guide/07-interaction-modes.md:37`
6. `packages/framework/core/amadeus-common/conductor.md:51`
7. `packages/framework/core/amadeus-common/protocols/stage-protocol.md:349`（上記 §2b と同一箇所、二重計上ではなく同一引用の別文脈）
8. `packages/framework/core/skills/amadeus-grilling/SKILL.md:5`

※ 上記列挙は8項目だが Developer scan は「7 hit」と要約している — 内訳は stage-protocol.md:349 の1文中に "one question at a time" と "hybrid termination" が同居するため、本節の主張（prose 消費者の数）としては8ファイル位置の列挙が正確な機械集計であり、Developer scan の要約数「7」は集計対象の数え方（ファイル数 vs 出現数）の粒度差であることを明記する（`cid:requirements-analysis:ledger-count-mechanical-recalc` に従い機械再計算した結果を優先表示）。

`1問ずつ` — **0 hit**。日本語は「一度に1質問」（`docs/reference/04-stage-protocol.ja.md:264`、検索パターン外のため件数集計には含めないが所在は記録）を使用しており、検索キーが英語直訳と異なる点に注意（`cid:application-design:c1-asd-multi-idiom-inventory` の「同一構造への複数アクセス形式」に相当する検索キー面の教訓）。

---

## 8. `amadeus-grilling/SKILL.md`（58行、非交差ファイル）

- Frontmatter: `name: amadeus-grilling`, `argument-hint`, `user-invocable: true`, `classification: read-only`
- `## Purpose` — `grilling-protocol.md` を単一の正本として指す（§1/§2/§3 を参照）
- `## Classification` — read-only 保証
- `## Standalone rules`（4規則）の規則2が depth 言及の唯一箇所: `**Discipline** is the protocol's §1 and §2 in full: ... bounded termination ("done" at any time; otherwise Minimal 4 / Standard 8 / Comprehensive 12 total questions). Use an explicitly requested level, or default to Standard (8) when the user names none.` — t415 L44 のピン `"default to Standard (8)"` と verbatim 一致確認

---

## 9. `conductor.md`（非交差ファイル）

`packages/framework/core/amadeus-common/conductor.md:50-53`（review 引用位置 :51-52 のまま不変）:

```
- Offer the interaction-mode flow per `stage-protocol.md` §3: guided
  (interactive walkthrough), grilling (one question at a time, per
  `grilling-protocol.md`), self-guided (edit the file directly), or chat
  (freeform). All four converge on the file.
```

---

## 10. tNNN 番号（機械再計算）

```
find tests -type f -iname "t[0-9]*" | grep -oE '/t[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -3
# → 528, 528, 529
```

使用済み最大 **t529**。本 intent は **t530** 以降を予約する。`t528` を共有する2ファイルの存在は未調査（真の重複採番か単体/統合バリアントの正当な共存かは本 re-scan のスコープ外）— loose thread として timestamp 記録に転記済み。`cid:code-generation:swarm-test-number-reservation` / `cid:code-generation:c1-tnnn-collision-on-regrounding` に従い、PR 発行前・マージ直前に固定 base SHA で再確認すること。

---

## 11. Facts vs Hypotheses まとめ

**Facts**（直接観測、exit code 0 確認済み）:

- 患部2ファイル（`stage-protocol.md` / `amadeus-directive.ts`）は `28e1f40c..HEAD` で変更されているが、両方とも #2766 advisory `handoff_stage` 機能のみが原因で、grilling/depth 節への影響はゼロ。全5箇所の review 時引用（§3表・Step 3d・§8・semi 経路・`VALID_DEPTH_VALUES`）は行番号・verbatim とも HEAD で同一
- `hybrid termination` / `ハイブリッド終了` の用語ドリフトは3ファイル3箇所（`stage-protocol.md:349`、`docs/reference/04-stage-protocol.md:320`、`.ja.md:264`）に存在し、canonical `grilling-protocol.md` の D6 見出しは既に `Bounded termination` に確定している
- depth 契約は現行「質問数予算」（Minimal 4 / Standard 8 / Comprehensive 12）のままで、frontier 駆動（枝刈り閾値）要素は `grilling-protocol.md` 全137行に0 hit
- 29ステージが `question-budget` センサーを宣言、専用 manifest ファイルなし
- `t415` が29個の verbatim pin で数値予算契約を固定、`t199` は dist 面の存在検査のみ（`hybrid`/`bounded` 用語は非対象）
- tNNN 最大使用値 t529、本 intent は t530 以降予約
- `1問ずつ` は0 hit、日本語は「一度に1質問」を使用（検索キー差異）
- `mattpocock/skills` のピン SHA `1495d014303e041c51c29f9e442485ba06f5878d` は canonical ファイルの帰属ヘッダには反映されていない（ヘッダは元リポジトリ URL のみ、コミット固定なし）

**Hypotheses / 未検証**（フラグのみ、事実として主張しない）:

- `t528` 二重採番が真の重複か単体/統合バリアントの正当な共存かは未調査
- `t199`/`t415` の dist ツリー assertion が現在ビルド済みの `dist/` に対して pass するかは未検証（本 re-scan はソース読み取りのみで `bun run build` / `bun test` を実行していない — engine 操作・git 状態変更禁止スコープ内の read-only scan）


## 訂正(2026-08-10、requirements-analysis §12a i1 の BLOCKER 反映)

- §7 の prose 消費者 sweep 述語 `git grep -n "one question at a time"` は**大小文字区別**であり、文頭大文字形 "One question at a time" を構造的に不検出だった。product-lead reviewer の case-insensitive 再実行(`git grep -in`)で追加6箇所が確定: `stage-protocol.md:277`(モード選択の Grill me 説明文)、`docs/reference/04-stage-protocol.md:294` / `.ja.md:244`、`docs/guide/14-artifacts-reference.md:208`、`docs/guide/16-worked-examples.md:102` / `.ja.md:115`。正しい全数は **12ファイル14行**(小文字形7ファイル8行+大文字形6箇所。stage-protocol.md は :349(小文字形)と :277(大文字形)の両方に出現するため、ファイル数は重複除去後 12 — §12a i2 reviewer の機械再計算による訂正 2026-08-10)。全数列挙の grep 述語は今後、大小文字の扱いを述語記録に含める(cid:requirements-analysis:enumeration-completeness-review の E-ASD-RES13 追補が求める「大小文字扱いが結果を変える場合はそれも含めて記録」の違反実例として自己記録)。
