# Business Logic Model — `stop-question-carveout`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `unit-of-work.md` §`stop-question-carveout`(依存ゼロの実測と FR-PIN-2 の所属)、`unit-of-work-story-map.md` §ゴールの割当(G 系)と §FR の割当(stop 4 件)、`requirements.md` 領域 C(FR-STOP-1/2 の現行 verbatim と受け入れ基準)、`components.md` C11 行と ADR-7、`component-methods.md` §C11(述語契約・呼び出し点割当の逐語 — 本 FD の正本)、`services.md` §プロセス境界 P4(stop hook)。

設計分岐の裁定は `functional-design-questions.md` D1〜D6(すべて機械導出)。

---

## 述語の分割(C11)

現行 `isFullyAutonomousIntent(:167-178)` を 2 述語へ分割する(ADR-7)。契約は §C11 の逐語(D1)、命名は D2:

```
// full 限定 — 既存名を保存(意味論完全同値。改名しない — D2)
function isFullyAutonomousIntent(stateContent, resolvedProjectDir?): boolean
  = intentAutonomyMode(stateContent) === "full"
    ∧ projection?.mode === "full" ∧ projection.currentGrant?.state === "active"
    (catch → false — 現行 :175-177 と同一)

// 質問 carve-out(semi + full)— 新設
function isQuestionCarveoutIntent(stateContent, resolvedProjectDir?): boolean
  = mode === "semi" → projection.mode === "semi" ∧ projection.modeProvenance.kind === "human-command"
    mode === "full" → isFullyAutonomousIntent と同じ判定
    それ以外        → false
    (catch → false)
```

## 呼び出し点の割当(FR-STOP-1 の表と 1:1)

| file:line(HEAD 実測) | 関数 | 使う述語 | 変更 |
| --- | --- | --- | --- |
| `:422`(`isPendingQuestionStop` 内、verbatim `if (isFullyAutonomousIntent(stateContent, resolvedProjectDir)) {`) | tier-2 質問 carve-out | **`isQuestionCarveoutIntent` へ差し替え** | semi へ開く(本 intent の唯一の開放点) |
| `:457` | `isPendingComposeStop`(tier-2b) | `isFullyAutonomousIntent`(そのまま) | 無改変 — full 限定維持 |
| `:716` | tier-3 conversational stop | `isFullyAutonomousIntent`(そのまま) | 無改変 — full 限定維持 |

`:457` / `:716` は呼び出しコードも述語も変わらない(既存名保存 — D2)ため、diff は「新述語の追加」と「`:422` の 1 行差し替え」に閉じる(`unit-of-work.md` の推定 28 行と整合)。

## データフロー

| 段 | データ | 供給元 | 消費先 |
| --- | --- | --- | --- |
| 1 | `Intent Autonomy Mode`(state) | `intentAutonomyMode:162-165`(既存) | 両述語の第 1 判定 |
| 2 | projection(mode / provenance / grant) | `readProductionAutonomyProjection`(既存・読取専用) | 両述語の第 2 判定 |
| 3 | boolean(carve-out 可否) | 新述語 | `isPendingQuestionStop:422` の分岐 |

semi の carve-out が「質問で止まらない」を実現するのは、core Unit の梯子が質問を裁定できることと組で初めて意味を持つ(`unit-of-work.md` §依存の理由 — yaml edge の stop → core は意味論的依存)。

## 検証シーケンス(t445 + FR-PIN-2)

- **t445(unit)**: 新述語の判定表全行 — semi(human-command)→ true / semi(system-default)→ false / full(grant active)→ true / full(grant 不在)→ false / none → false / 不正値・catch → false。in-process 駆動(述語を export — D6)。
- **FR-STOP-1 (1)(integration、t121 拡張)**: semi の状態で `:422` 経路が carve-out を得る(質問 pending で stop しない)。
- **FR-STOP-1 (2)(integration)**: semi の状態で `:457` / `:716` 経路が carve-out を得ない(従来どおり stop)。**落ちる実証**: 述語を無条件共有(`:457` / `:716` も carve-out 述語)へ戻すと赤 — 注入 → 赤 → 復元 → 残渣ゼロの 1 セット(NFR-1)。
- **FR-PIN-2(t121:1138-1150 反転)**: D4 のとおり「semi + blank question ALLOWS」ピンを BLOCK(走行継続)期待へ反転し、テスト名を新意味論へ改訂。同一 PR で C11 変更と不可分。
- **FR-STOP-2**: `AUTONOMOUS_BLOCK_CAP` / `stopBudgetMode` が diff に現れないこと+既存 cap / budget テストの無改変 green(D5)。cap テストの実測(worktree HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01`): `tests/unit/t147-kiro-hook-adapter.test.ts:721`(verbatim `  test("13: FULL KEEPS CAP 8 - Kiro stop still blocks on call 3 under full Intent autonomy (the long ceiling, not the interactive 2)", () => {`)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:09:05Z
- **Iteration:** 1
- **Scope decision:** none

述語契約・呼び出し点割当・6件のconsumes参照は上流と1:1で整合するが、business-rules.md/business-logic-model.mdが上流で唯一検証済みの単一行引用(allowlist:5268, t147:723=コメント)と食い違う未実測の行範囲・虚偽の『cap テスト』所在を断定しており、引用の実在検査に失敗する。

### Findings

- BLOCKER | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/stop-question-carveout/functional-design/business-rules.md:18 — R6 が『同期対象(allowlist :5265-5272 / t147:721-725)』と行範囲を断定しているが、requirements.md:129、component-methods.md:626、components.md:202 はすべて単一行 :5268(verbatim `"function": "isFullyAutonomousIntent",`)と :723(コメント)のみを実測引用しており、範囲(5265-5272 / 721-725)を裏付ける上流引用は5ファイルのどこにも存在しない。cid:requirements-analysis:mechanism-cite-verify-at-draft / cid:nfr-requirements:compilation-stage-source-first が禁じる未実測の引用捏造に該当する
- BLOCKER | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/stop-question-carveout/functional-design/business-logic-model.md:56 — FR-STOP-2 の検証記述が『既存 cap / budget テスト(t147:721 の cap テスト含む)』と断定するが、上流5成果物(requirements.md, components.md, component-methods.md, unit-of-work.md, unit-of-work-story-map.md)が実測引用する t147 の唯一の行は :723 であり、かつそれは『コメント』(同期対象コメント)としてのみ記述されている。:721 が cap テストであるという主張はどの上流にも根拠がなく、上と同一機序の未実測引用

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:12:58Z
- **Iteration:** 2
- **Scope decision:** none

両BLOCKERは実測verbatim付き引用への差し替えで閉包し、record全域に旧未実測範囲の残存なし。

### Findings

- None
