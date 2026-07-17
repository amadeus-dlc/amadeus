# Business Logic Model — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`、`../../../inception/units-generation/unit-of-work-story-map.md`、`../../../inception/requirements-analysis/requirements.md`(FR-1〜6)、`../../../inception/application-design/components.md`(C1〜C7)、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`。

## 処理フロー(変更面のみ — 新規アルゴリズムなし)

### F-1: ハーネス名解決(既存フロー・値集合のみ拡張)

```
入力 raw(--harness 引数 or wizard 選択)
  → HarnessName.parse(raw)                          … harness.ts:29(変更なし)
    → all.includes(raw) ?                            … all が 4→6 値(AC-1a)
      Yes → Result.ok(HarnessName)
      No  → Result.err(InvalidHarnessName)
           → reporter の invalid 文言(6値列挙、AC-1c)→ exit 2
```

テキストフォールバック: parse は membership 判定のみ。判定アルゴリズム・分岐構造は不変で、`all` frozen 配列の要素が opencode / cursor を含むようになるだけ。

### F-2: エンジン dir 解決(map 参照 — 変更は entry 追加のみ)

`engineDirNameFor(harness)` は `ENGINE_DIR_BY_HARNESS`(engine-layout.ts:8-13)の全域 map 参照。opencode→`.opencode`、cursor→`.cursor` の 2 entry 追加(AC-1b、各固有 dir — ADR-2)。未知キーの fail-fast(:15-20)は既存のまま。

### F-3: install→verify 完走(汎用機構 — 無改修で自動追随)

wizard(HarnessName.all 駆動)→ plan(walkFiles)→ payload(readdirSync)→ verifier(engineDirNameFor)の各段は per-harness 分岐を持たない(RE 面2実測)。dist/opencode・dist/cursor が fixture / 実配布物に存在すれば自動伝播(AC-1e — ここに変更を入れたら逸脱停止)。

### F-4: runtime 2面(FR-6 — install 正しさと分離、E-1048-FD-Q1 = A 裁定反映)

- KNOWN_HARNESS_DIRS(amadeus-lib.ts:121)へ `.opencode` / `.cursor` 追加 — CWD probe(:142/:227)に加え、`hasWorkspaceMarker`(:268-271)経由で `resolveProjectDirFromHook` の rung 2(worktree 誤収束対策 — rung 3 の script-path derivation より先)に消費される**実挙動変更を含む**。opencode/cursor 単独 worktree の rung 2 偽陰性(現行3値)を解消する方向の変更で、失敗経路の追加はない。権威(rung 3)自体は不変。検証は AC-6e の worktree 解決テスト1本(裁定 A)
- otherTrees(amadeus-utility.ts:860)へ opencode / cursor 追加 — doctor advisory 列挙のみ、hard gate なし(AC-6c)

## データ変換

なし — 本 unit は値集合の拡張であり、変換ロジック・処理順序・決定木の追加はない(FR-1 AC-1e)。

## スコープ外宣言

FR-4(`npm pack --dry-run` 実検証+将来条件チェックリスト)は build/verification 面であり、本 unit の業務ロジック設計の対象外 — code-generation / build-and-test 段で扱う(requirements.md AC-4a/4b に既収載)。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-17T00:00:00Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Status |
|---|---|---|---|---|
| — | — | — | (iteration 1 の指摘はすべて解消。新規指摘なし) | — |

**iteration 1 Critical #1(KNOWN_HARNESS_DIRS「advisory のみ」特徴づけの不整合)— 解消確認**
上流 `../../../inception/requirements-analysis/requirements.md` FR-6 AC-6a を実コード `packages/framework/core/tools/amadeus-lib.ts` と再照合した。
- `:121` `const KNOWN_HARNESS_DIRS = [".claude", ".kiro", ".codex"] as const;` — 現行3値。AC-6a の「現行3値」記述と一致。
- `:142`(`deriveHarnessDir` 内 CWD probe `for (const h of KNOWN_HARNESS_DIRS) { if (existsSync(join(cwd, h))) return h; }`)/ `:227`(`export function resolveProjectDir(explicitDir?: string): string {`)— AC-6a の file:line 引用と一致。
- `:268-271` `function hasWorkspaceMarker(dir: string): boolean { if (!isDir(join(dir, "amadeus"))) return false; return KNOWN_HARNESS_DIRS.some((h) => isDir(join(dir, h, "tools"))); }` — AC-6a 引用と完全一致。
- `:293-300`(`resolveProjectDirFromHook` rung 2)の verbatim「In a worktree session the hook SCRIPTS live in the launch dir (the main checkout), so rung 3 below would converge on main even though the engine's cwd — and the record it writes — is the worktree.」— AC-6a の引用文と実ファイル(:293-296)を照合し一字一句一致を確認。
- 結論: KNOWN_HARNESS_DIRS への opencode/cursor 追加は `hasWorkspaceMarker` 経由で `resolveProjectDirFromHook` rung 2 の実挙動を変える(opencode/cursor 単独 worktree での rung 2 偽陰性解消)。AC-6a 訂正文・F-4・BR-5 の特徴づけはこの実挙動と完全に一致し、旧「advisory のみ」表現との齟齬は解消されている。

**iteration 1 Minor #2(BR-1 契約テスト file:line 欠落)— 解消確認**
`business-rules.md` BR-1 に追記された `tests/unit/setup-harness.test.ts:13` / `tests/unit/setup-harness-parse.test.ts:17` を実ファイルと照合。
- `setup-harness.test.ts:13`: `expect(names.sort()).toEqual(["claude", "codex", "kiro", "kiro-ide"].sort());` — 現行4値 literal、一致。
- `setup-harness-parse.test.ts:17`: `for (const name of ["claude", "codex", "kiro", "kiro-ide"]) {` — 現行4値 literal、一致。
両テストとも「dist 動的導出は共変偽 green のため禁止」の契約テスト方針(BR-1)と整合し、code-generation 段での6値更新対象として正しく特定されている。

**iteration 1 Minor #3(FR-4 スコープ外宣言欠落)— 解消確認**
`business-logic-model.md` 末尾に「スコープ外宣言」節が追加され、FR-4 が build/verification 面(code-generation / build-and-test 段)である旨と requirements.md AC-4a/4b への参照が明記されている。

### 伝播漏れチェック

FD 4ファイル(`business-logic-model.md` / `business-rules.md` / `domain-entities.md` / `frontend-components.md`)+ 上流 `requirements.md` を「advisory のみ」「advisory only」「advisory-only」の3表記で grep — 0件。旧表現の残存なし。

### iteration 1 READY 面の退行チェック

- `domain-entities.md`: `HarnessName` 型(harness.ts:9)、`all`(:19-24)、`parse`(:29)、`InvalidHarnessName`(:16)、`ENGINE_DIR_BY_HARNESS`(engine-layout.ts:8-13)、`engineDirNameFor` fail-fast(:15-20)を実ファイルと再照合 — 全件一致。退行なし。
- `frontend-components.md`: `reporter.ts:19-27`(usage 2本 `:24-25`)、`:137`(invalid エラー文言)を実ファイルと再照合 — 一致。退行なし。
- Forbidden 非混入: 本 iteration の是正差分(F-4/BR-5 訂正文・BR-1 file:line 追記・スコープ外宣言節)に後方互換レイヤー・フォールバック分岐・移行シムの新規混入なし。BR-4(汎用機構への per-harness 分岐追加禁止)にも抵触しない。

### Validation Tool Results

このステージに `validation_tools` の宣言なし(ステージ定義 `.claude/amadeus-common/stages/construction/functional-design.md` に該当フィールドなし)。file:line 実測による手動クロスチェックで代替。

### Summary

iteration 1 の Critical 1件・Minor 2件はいずれも実コード再照合により意図どおり閉じていることを確認した(E-1048-FD-Q1 = A 裁定の反映が実挙動と一字一句整合)。新たな矛盾・伝播漏れ・iteration 1 READY 面の退行は検出されなかった。READY。(GoA 注記: 1 — 条件なし)
