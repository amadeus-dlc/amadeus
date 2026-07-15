# reverse-engineering スキャンノート — 260715-parser-checkbox-fixes

Developer code scan の実測記録。手法は diff-refresh（cid:reverse-engineering:c1）。全 file:line は observed HEAD `6495e03a12d9e7149c2e80b59f171a90607a2d2c` の実コードを sed/grep 直読で確定し、記載直後に再実測した（fix-diff-independent-reverify）。

## メタデータ

| 項目 | 値 |
| --- | --- |
| Intent | `260715-parser-checkbox-fixes`（bugfix） |
| Base commit | `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` |
| Observed commit | `6495e03a12d9e7149c2e80b59f171a90607a2d2c`（`git rev-parse HEAD` 実測一致） |
| 距離 | 65 commits（`git rev-list --count cf3dc88..HEAD` = 65） |
| 祖先性 | `git merge-base --is-ancestor cf3dc88 HEAD` → exit 0 |
| Focus | #1013 practices-promote parseRules の ALWAYS/NEVER 契約非検証 / #1015 scope-change checkbox 再構築の6→4状態崩落＋ヘッダ drift |
| 実施体制 | Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3） |

## 区間 diff とフォーカス面交差

`git diff --name-only cf3dc88..HEAD -- .claude/tools/ .claude/amadeus-common/ packages/framework/` の実測結果、フォーカス面との交差は以下:

- **`.claude/tools/amadeus-lib.ts`**: 区間内で **変更あり**（CheckboxState 型・CHECKBOX_MAP・CHECKBOX_REVERSE の定義面。ただし6状態定義自体は base 時点で確立済みで、下記の引用行はいずれも現行値で確定）
- **`.claude/tools/amadeus-utility.ts`**: 区間内で **変更あり**（#1015 の handleScopeChange を含む。行番号シフトあり — 下記参照）
- **`.claude/tools/amadeus-state.ts`**: 区間 diff に **出現せず**（`git diff --name-only … | grep amadeus-state.ts` = 0件）。よって #1013 の引用行は base 時点と不変。
- **`.claude/amadeus-common/stages/inception/practices-discovery.md`**: 区間 diff に **出現せず**（intent record 配下の同名成果物ヒットのみ）。stage 契約行は不変。

`.claude/tools/*` は `packages/framework/core/tools/*` と byte 同一（`diff -q` で lib.ts / utility.ts / state.ts いずれも IDENTICAL 実測）。`.claude/tools/` は project-local self-install ツリー、`dist/<harness>/` は build 出力。編集正本は `packages/framework/core/tools/`。

### 行番号ずれの検出結果

| 指定 | 引用（プロンプト） | 現 HEAD 実測 | 判定 |
| --- | --- | --- | --- |
| #1013 parseRules | `amadeus-state.ts:2556-2561` | 2556-2561 | **一致**（state.ts は区間無変更） |
| #1013 stage 契約 | `practices-discovery.md:101` | 101（"One rule per line."） | **一致** |
| #1015 三項マーカー | `amadeus-utility.ts:3227-3230` | 3228-3230（三項本体は 3229） | **ずれ（開始 +1）** |
| #1015 ヘッダ drift | `amadeus-utility.ts:3238` | 3238 | **一致** |
| #1015 正本テンプレ | `amadeus-utility.ts:2748`（6状態） | 2748 | **一致** |
| CheckboxState 型 | `amadeus-lib.ts:58` | 58 | **一致** |
| CHECKBOX_MAP | `amadeus-lib.ts:60-67` | 60-67 | **一致** |
| CHECKBOX_REVERSE | `amadeus-lib.ts:69-` | 69-76 | **一致** |

## 欠陥1: #1013 — parseRules の ALWAYS/NEVER 契約非検証

### 現行実装（`amadeus-state.ts:2556-2561`）

```
const parseRules = (sectionContent: string): string[] => {
  return sectionContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("<!--") && !l.startsWith("#"));
};
```

フィルタ条件は「非空・非コメント（`<!--`）・非見出し（`#`）」のみ。`ALWAYS …` / `NEVER …` プレフィックスの検証は **存在しない**。`## Mandated` / `## Forbidden` セクション配下の任意の散文行が生存し、そのままルールとして append される。

### 全呼び出し元（grep 全域 — 列挙の完全性）

`grep -rn 'parseRules' .claude/ packages/framework/core/` の実測:

- `amadeus-state.ts:2556` — 定義（`handlePracticesPromote` 内のローカル arrow）
- `amadeus-state.ts:2570` — `const mandatedRules = parseRules(mandatedDraft);`
- `amadeus-state.ts:2571` — `const forbiddenRules = parseRules(forbiddenDraft);`
- （正本 `packages/framework/core/tools/amadeus-state.ts` に同一3ヒット）

呼び出し元は **`handlePracticesPromote` の2箇所のみ**。他ファイル・他関数からの呼び出しは無い（ローカルスコープの arrow で export もされていない）。

### practices-promote 処理フロー（`handlePracticesPromote`、`amadeus-state.ts:2447-`）

1. **フラグ解析**（:2449-2457）— `--team-practices` / `--discovered-rules` 必須、`--affirming-user` / `--target-dir` 任意。
2. **書込先解決**（:2469-2471）— `targetRoot = flags["target-dir"] ?? memoryDirFor(pd)`、`team.md` / `project.md` を `join`。
3. **draft 読込**（Step 1、:2493-）— team-practices / discovered-rules の存在確認（不在は `fail()`）→ ファイル読込。
4. **セクション抽出**（:2562-）— `extractMarkdownSection(discoveredRulesDraft, "## Mandated")` / `"## Forbidden"`。
5. **parseRules 適用**（:2570-2571）— mandated/forbidden の各行リスト化（**ここで契約未検証**）。
6. **appendUnderHeading**（:2574-2601）— 各ルールを `${rule} (affirmed ${today})\n` で stamp し `## Mandated` / `## Forbidden` 見出し配下へ append。`rulesAppended.mandated/forbidden` をインクリメント。
7. **書込**（Step 4&5、:2610-）— `project.md` を先に write、次に `team.md`。project 成功後の team 失敗は `PRACTICES_OVERRIDE` audit + `fail()`。
8. **audit** — `fail()` 経路で `emitAudit(pd, "PRACTICES_OVERRIDE", …)`。正常系は末尾で成功 audit（本スキャン範囲外）。

### 欠陥の帰結

draft の `## Mandated` に `ALWAYS` 非接頭の散文行（例: interview の生回答・見出しでない注記）が混ざると、`(affirmed date)` を付されて project.md の `## Mandated` に契約ルールとして着地する。stage 契約（`practices-discovery.md:101`「`## Mandated`（rules with `ALWAYS …` format）… One rule per line」）に反する。parseRules は draft 側の書式健全性を前提にしており、書式検証ゲートが不在。

## 欠陥2: #1015 — scope-change checkbox 再構築の状態崩落＋ヘッダ drift

### 所在の切り分け（重要）

- 欠陥は **`handleScopeChange`**（`amadeus-utility.ts:3136`、CLI verb `scope-change`、dispatch :4070-4071）内。
- `handleRecompose`（:3306、verb `recompose`）は **別関数** で、suffix のみ編集しマーカーを触らない（t194 が「marker untouched」を検証）。t194 は handleScopeChange を **検査しない**。

### 再構築フロー（`handleScopeChange`）

1. `const existingCheckboxes = parseCheckboxes(content);`（:3195）
2. `const existingMap = new Map(existingCheckboxes.map(c => [c.slug, c]));`（:3196）
3. phase ごとに Stage Progress 行を再生成するループ（:3204-3234）。各 stage で `const existing = existingMap.get(stage.slug);`（:3226）→ **三項マーカー構築**（:3228-3230）。
4. ヘッダ書き戻し `stageProgressHeader`（:3238）で Stage Progress セクションを replace（:3237-3239）。

### 三項マーカー（`amadeus-utility.ts:3228-3230`）— 6→4状態崩落

```
const marker = existing
  ? `[${existing.state === "completed" ? "x" : existing.state === "in-progress" ? "-" : existing.state === "skipped" ? "S" : " "}]`
  : "[ ]";
```

completed→`x` / in-progress→`-` / skipped→`S` の3状態のみを明示し、**残り（awaiting-approval / revising / pending）はすべて末尾 `: " "` = `[ ]`（pending）へ落ちる**。

### parseCheckboxes は6状態を正しく認識（`amadeus-lib.ts:3395`）

`parseCheckboxes` の regex `^- \[([ xSR?-])\] (\S+)\s*—\s*(.*)$`（:3397）は `?` / `R` を含む6マーカーを受理し、switch で `?`→`awaiting-approval` / `R`→`revising` に復元する。よって `existingMap` は awaiting-approval / revising を **忠実に保持** している。崩落は再構築の三項側で発生する — 入力（existingMap）は正しく、出力（marker）で `[?]` / `[R]` が `[ ]` に化ける。

含意: gate-open（awaiting-approval）または user-rejected（revising）状態のステージが載った state に対して `scope-change` を実行すると、その状態が pending に退行する。ゲート再取得・revising ループの喪失につながる。

### 副次 drift: 再構築ヘッダの4状態表記（`amadeus-utility.ts:3238`）

```
const stageProgressHeader = "## Stage Progress\n<!-- Checkbox states: [ ] not started, [-] in progress, [x] completed, [S] skipped via --stage/--phase jump -->\n";
```

`[?]` awaiting approval と `[R]` revising が凡例から欠落（4状態表記）。正本テンプレは `amadeus-utility.ts:2748`:

```
<!-- Checkbox states: [ ] not started, [-] in progress, [?] awaiting approval (gate open), [R] revising (user rejected gate), [x] completed, [S] skipped via --stage/--phase jump -->
```

= 6状態表記。scope-change を通すと state ファイルのヘッダが6状態→4状態に退行する drift。

### 状態型の正本（`amadeus-lib.ts`）

- `CheckboxState`（:58）: `"pending" | "in-progress" | "awaiting-approval" | "revising" | "completed" | "skipped"`（6状態）
- `CHECKBOX_MAP`（:60-67）: state→marker の1正本（pending `[ ]` / in-progress `[-]` / awaiting-approval `[?]` / revising `[R]` / completed `[x]` / skipped `[S]`）
- `CHECKBOX_REVERSE`（:69-76）: marker→state の逆写像

正しいマーカー構築経路は `CHECKBOX_MAP[newState]`（`amadeus-lib.ts:3435`、`setSlugState` 系）。#1015 の三項は CHECKBOX_MAP を使わず手書き列挙したため状態を取りこぼした。

## 手書き marker 構築の同根箇所（全域 grep）

`state === "…" ? "x/-/S"` 形の **マーカー文字列を手書き構築** する箇所の実測（読み取り・フィルタの `state === "completed"` 比較は defect 対象外として除外）:

| file:line | 内容 | 判定 |
| --- | --- | --- |
| `amadeus-utility.ts:3229` | scope-change 再構築の3状態三項 | **欠陥（#1015、6→4崩落）** |
| `amadeus-utility.ts:2656` | `const marker = isInit ? "[x]" : "[ ]"`（新規 state 生成時のテンプレ構築、:2648-2658） | **非欠陥**（初期化時は既存状態が無く、init=completed / 他=pending の二値で正しい。既存状態の取りこぼしは起きない） |
| `amadeus-lib.ts:3435` | `const marker = CHECKBOX_MAP[newState]` | **正準経路（欠陥なし）** |

手書き marker 構築サイトは計 **2箇所**（3229 欠陥 / 2656 良性）。既知の「1箇所（utility.ts:3229）」に対し、同形の 2656 を追加検出したが、2656 は初期化文脈で状態崩落を起こさないため修正対象外。正準 CHECKBOX_MAP 経路は 1箇所（lib.ts:3435）。#1015 の surgical な修正方向は 3229 を CHECKBOX_MAP 参照へ置換すること。

## 既存テストカバレッジ（tests/ 全域 grep）

### #1013 practices-promote

- **`tests/integration/t75.test.ts`** — practices-promote を統合検査。fixture の discovered-rules draft（:168-176）は Mandated に `ALWAYS use Result<T,E> …` / `ALWAYS write tests …`、Forbidden に `NEVER throw exceptions …` / `NEVER skip CI gates` と **すべて ALWAYS/NEVER 接頭の整形済み行**。project.md に両方が着地することを確認するケースはあるが、**ALWAYS/NEVER 非接頭の散文行を拒否/検証するケースは存在しない**（`grep -n 'malformed\|invalid\|reject\|not.*ALWAYS\|not.*NEVER\|prose'` = 0件）。
- `tests/unit/t17.test.ts` — subcommand 一覧に practices-promote を列挙する程度。
- **結論**: #1013 の欠陥（契約非検証）は **未カバー**。書式健全な draft のみを流すため、散文混入時の誤 append を捕捉するテストが無い。

### #1015 scope-change checkbox 再構築

- **`tests/unit/t194-recompose.test.ts`** — `handleRecompose`（別関数）を検査。「marker untouched」（:12/:94/:101）を保証するが、これは suffix-only 編集の recompose であり **scope-change の再構築マーカーは対象外**。
- `tests/unit/t118.test.ts` ほか scope-change/`--scope` 系 — checkbox 状態の init-done 前提や jump 経路を扱うが、awaiting-approval / revising の保存は検証しない。
- **全域確認**: `grep -rln 'awaiting-approval\|"\[?\]"\|revising' tests/unit tests/integration | xargs grep -l 'scope-change\|handleScopeChange'` = **0件**。scope-change と `[?]`/`[R]` 保存を結合するテストは存在しない。
- **結論**: #1015 の欠陥（6→4崩落・ヘッダ drift）は **未カバー**。

両欠陥とも、code-generation で「落ちる実証」用の新規テスト（散文行注入 / `[?]`・`[R]` を載せた state への scope-change）を追加する必要がある。

## 正本の所在と dist 再生成

- **編集正本**: `packages/framework/core/tools/amadeus-state.ts`（#1013）/ `amadeus-utility.ts`（#1015）。`.claude/tools/*` は byte 同一の self-install コピー、`dist/{claude,codex,kiro,kiro-ide}/…/tools/*` は build 出力（いずれも手編集 Forbidden）。
- **同期手順**: 正本編集後 `bun run dist`（`scripts/package.ts`）で dist 再生成、`bun run promote:self`（`scripts/promote-self.ts --apply`）で project-local self-install を同期。検証は `bun run dist:check` + `bun run promote:self:check` + `bun run typecheck` + `bun run lint` + `bash tests/run-tests.sh --ci`。
- 参考: `packages/framework/core/tools/` = `CORE_ROOT`（`package.ts:56-57`）。`.ts`/`.json` はトークン置換なしコピー、harness は manifest から発見。

## 対象外（本 bugfix diff-refresh）

codekb の business-overview / architecture / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment は本欠陥2件が挙動欠陥で構造変化を伴わないため温存（churn 回避、cid:reverse-engineering:c1）。区間 diff で当該ファイルの記述と矛盾する大変更は検出されなかった。
