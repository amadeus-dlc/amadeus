# Business Logic Model — `autonomy-statusline`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `unit-of-work.md` §`autonomy-statusline`(Unit 境界と依存ゼロの根拠)、`unit-of-work-story-map.md` §`autonomy-statusline`(実装 2 項目)と §ゴールの割当(横断「表示の同一語彙」行)、`requirements.md` FR-DISP-1(受け入れ基準)、`components.md` C14 行と ADR-10(Option A 裁定)、`component-methods.md` §C14(シグネチャ・出力表・連結様式の逐語)、`services.md` §プロセス境界 P5 行と §S10(表示サービス、追加コストゼロの制約)。

本 Unit のロジックは純関数 1 本と配線 1 行に閉じる。設計分岐の裁定は `functional-design-questions.md` D1〜D4(すべて機械導出)。

---

## 処理シーケンス

statusline hook(`services.md` P5 — 毎プロンプト起動、non-blocking)の 1 回の実行における本 Unit の関与は次の 3 手である。

```
main()                                     [amadeus-statusline.ts — 既存]
  ├─ state = readFileSync(stateFile)       [:286 — 既存。追加 I/O なし(ADR-10)]
  ├─ …既存のセグメント構築(phase / bar / stage / agent)…
  ├─ autonomy = autonomySegment(state)     [新規 — amadeus-lib.ts の純関数を呼ぶ(D1)]
  └─ if (autonomy) output += ` @${autonomy}`   [新規 — C14 verbatim の連結様式(D3)]
```

テキスト代替: `main()` が既に読んでいる state 文字列を、既存セグメント構築の後に新設純関数 `autonomySegment` へ渡す。返り値は bare の mode 名(`""` / `"none"` / `"semi"` / `"full"` — C14 シグネチャのコメント逐語 `// "" | "semi" | "full" | "none"` のドメイン)であり、` @` の前置と truthy 判定は呼び出し側 `main()` が C14 verbatim `if (autonomy) output += ` @${autonomy}`;` の形で行う。関数本体は `amadeus-lib.ts` に置き、statusline は import して呼ぶ。

## アルゴリズム — `autonomySegment`

```
function autonomySegment(stateContent: string): string
  1. mode ← getField(stateContent, "Intent Autonomy Mode")?.trim()
     — amadeus-lib.ts:4845 の既存 getField を使う(実測: `grep -n "export function getField"
       amadeus-lib.ts` → `4845:export function getField(content: string, field: string): string | null`)。
       amadeus-stop.ts:163 の読み取り(verbatim `getField(stateContent, "Intent Autonomy Mode")?.trim()`)と
       同一の情報源・同一の抽出手順(ADR-10 の「hook 層の一貫性」)
  2. mode が AUTONOMY_SEGMENT_MODES(= ["none","semi","full"] as readonly AutonomyMode[])
     に含まれなければ "" を返す(不在・不正値の縮退 — component-methods.md §C14 の出力表)
  3. 含まれれば mode をそのまま返す(bare の mode 名。` @` 前置は呼び出し側 — C14 連結様式)
```

決定表(関数の返り値と、C14 連結様式適用後の表示の 2 列で示す。表示列は `component-methods.md` §C14 の出力表からの転記):

| 入力(`Intent Autonomy Mode` の値) | `autonomySegment` 返り値 | 表示(main() 連結後) |
| --- | --- | --- |
| `none` | `"none"` | ` @none` |
| `semi` | `"semi"` | ` @semi` |
| `full` | `"full"` | ` @full` |
| フィールド不在 / 上記 3 値以外 | `""` | (セグメントを足さない — if の falsy 分岐) |

値域の canonical は `amadeus-intent-autonomy.ts:9` verbatim `export type AutonomyMode = "none" | "semi" | "full";` であり、`import type`(runtime 消去)+ literal 配列の型注釈で束ねる(D2)。値域が canonical 側で変われば typecheck が赤になり、表示側の黙った乖離を作らない。

## データフロー

| 段 | データ | 供給元 | 消費先 |
| --- | --- | --- | --- |
| 1 | state ファイル文字列 | `main()` の既存 read(`:286`) | `autonomySegment` の引数 |
| 2 | `Intent Autonomy Mode` フィールド値 | `getField` 抽出 | 値域判定 |
| 3 | mode 文字列(`""` \| `"none"` \| `"semi"` \| `"full"`) | `autonomySegment` 返り値 | `main()` の if 付き連結(truthy なら ` @` を前置して `output` の最終段へ) |

書き手はいない(本 Unit は読み・表示のみ)。`Intent Autonomy Mode` フィールドは Intent birth 時に必ず書かれる(`components.md` §C14〜C15 の実測 — `amadeus-utility.ts:4635` verbatim `- **Intent Autonomy Mode**: none`)ため、本 intent の他 Unit の着地を待たずに 3 値すべてが表示可能である(`unit-of-work.md` §依存を持たない理由)。

## 経路の適用範囲(決定木)

`main()` には output 連結に到達しない早期 return 経路が 3 つある(実測: `amadeus-statusline.ts`)。本 Unit はそれらに触れない(D3 — 挿入先は `output` 構築部のみで構造的に一意):

```
main()
  ├─ state ファイル不在 → "ready" 行で return(:277-280)  … セグメントなし(状態が無い)
  ├─ phase 不在        → "ready" 行で return(:299-301)  … セグメントなし
  ├─ Status=Completed  → COMPLETE 行で return(:306-315) … セグメントなし(workflow 終端)
  └─ active workflow   → output 連結(:317-322)          … ここにのみ ` @<mode>` が付く
```

## 検証シーケンス(t448)

`unit-of-work-story-map.md` §`autonomy-statusline` の実装 2 項目のうち項目 2(FR-DISP-1 のユニットテスト)は、shipped surface の `dist/claude/.claude/tools/amadeus-lib.ts` から `autonomySegment` を in-process import し(D4、兄弟様式 t168:41)、決定表の 4 行(3 mode + 不正値)+ フィールド不在の計 5 ケースを関数の返り値ドメイン(bare mode 名 / 空文字)で assert する。表示形 ` @<mode>` は C14 verbatim の連結様式(呼び出し側 1 行)が決定的に合成するため、mode 語彙の assert が FR-DISP-1 の「対応する語彙を出す」受け入れ基準を充足する。純関数のため実 FS・spawn を使わず、`tests/unit/t448-autonomy-statusline-segment.test.ts` に置く。配線行(statusline 側 1 行)は spawn-only ファイル内であり lcov に現れない(patch gate は lcov 掲載行のみ数える — `tests/coverage-patch-gate.ts:404` verbatim `measuredAdded: number; // added lines present in lcov`)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T10:11:41Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(返り値ドメイン・連結様式の C14 逐語不一致)は3成果物+questions へ一貫して伝播是正され、決定表・テスト表・FR-DISP-1・両 FOLLOW-UP も整合したため READY

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/autonomy-statusline/functional-design/business-logic-model.md:23 — 上流 component-methods.md:473・components.md:267・component-dependency.md:97・services.md:146・decisions.md:470 は一貫して `extractField(state, ...)` を読み取り関数として記すが、本 FD は `getField`(amadeus-lib.ts:4845)へ無申告で置換している。D1 の申告文(:28)は『変わるのは関数定義の所在のみ』と明言しており、読み取り関数名の変更はこの主張の射程外。iteration 1 で本件は FOLLOW-UP 止まり(実測記録の追加のみ要求)だったため今回は blocking しないが、D1 と同様の 1 行の申告(『extractField は既存コードに実在しないため getField(:4845) へ精密化した』等)を次回改訂時に追加すると、無申告逸脱チェックの観点で完全になる
