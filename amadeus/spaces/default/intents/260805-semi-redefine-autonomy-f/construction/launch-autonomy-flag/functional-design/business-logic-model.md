# Business Logic Model — `launch-autonomy-flag`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `unit-of-work.md` §`launch-autonomy-flag`(C12⇄C13 の統合根拠と依存しない理由)、`unit-of-work-story-map.md` §`launch-autonomy-flag`(実装項目と落ちる実証)、`requirements.md` 領域 E(FR-CLI-1〜5 の受け入れ基準)、`components.md` C12/C13 行と ADR-8(engine 内適用の裁定)、`component-methods.md` §C12 / §C13(分岐コード・判定表・context 型の逐語)、`services.md` §プロセス境界 P3(engine プロセス)と §S5。

設計分岐の裁定は `functional-design-questions.md`(Q1 = decide-question 裁定、D1〜D6 = 機械導出)。

---

## 処理シーケンス(invoke から適用まで)

```
/amadeus --autonomy <v> [自由文]
  └─ handleNext(args, projectDir)                    [amadeus-orchestrate.ts:2440 — 既存]
       ├─ flags = parseNextFlags(args)               [:1008 — C12 の 2 分岐を追加]
       ├─ …Branch 0〜2(latch / read-only / migration)… [既存・無改変]
       ├─ stateContent = loadStateFileIfPresent(pd)  [:2540 — 既存]
       ├─ …Branch 3b / 4(--scope 検証)…              [:2632-2638 — 既存・無改変]
       ├─ ★新 Branch: flags.autonomy || flags.autonomyMissingValue のとき
       │    applyLaunchAutonomyDeclaration(pd, stateContent, flags)   [C13 — 新規]
       │      ├─ kind:"error"    → errorDirective(message) を emit して return
       │      └─ kind:"continue" → 後続 Branch へフォールスルー
       └─ …birth 分岐(:2707)/ Branch 5(scope-change)/ directive 構築…  [既存・無改変]
```

テキスト代替: parser(C12)が `--autonomy` の値を consume して `flags.autonomy` に運び(値なしは `flags.autonomyMissingValue` を立てる)、state 読込と scope 検証の後・birth 分岐より前に置く新 Branch が C13 ハンドラを呼ぶ。C13 は error なら既存 `errorDirective` で loud 停止、continue なら通常フローへ戻す。呼び出し位置の根拠は questions D3(ADR-8 Consequences の様式指定+Q1 裁定 A の構造要件)。

## アルゴリズム 1 — C12 parser(`parseNextFlags` への 2 分岐追加)

`component-methods.md` §C12 の逐語コードを採用(D1):

```
} else if (a === "--autonomy" && i + 1 < args.length) {
  // CONSUME the value (same reason as --report: an unrecognized valued flag
  // would leak its value into the freeform intent text).
  flags.autonomy = args[i + 1];
  i++;
}
…(ladder 末尾)…
} else if (a === "--autonomy") {
  flags.autonomyMissingValue = true;
}
```

- 値域検査は**行わない**(parse 段は文字列を運ぶだけ — `--scope` が Branch 3b で検査する様式に倣う。`amadeus-orchestrate.ts:2632-2638` 実測)。
- FS I/O ゼロ(NFR-3)。

## アルゴリズム 2 — C13 適用ハンドラ(判定順)

判定 0 は Q1 裁定(AUTO_DECIDED auto-decision-7bb5f69976f0c87168e4fa57ffb01bf6)による前置、判定 1〜8 は `component-methods.md` §C13 判定表の逐語採用(D2):

| # | 条件 | 戻り |
| --- | --- | --- |
| 0 | `stateContent === null`(active intent 不在 — birth 経路・cursor 未設定) | `error`(loud)— birth を先に行い、その後 `/amadeus --autonomy <mode>` または `amadeus-bolt set-autonomy` で宣言する旨を案内 |
| 1 | `flags.autonomyMissingValue` | `error`「`--autonomy` requires a value: none, semi, or full.」 |
| 2 | 値が3値以外 | `error`「Invalid --autonomy "<v>". Valid values: none, semi, full.」 |
| 3 | projection 読取が `unreadable` | `error`(fail-closed — ADR-12) |
| 4 | `ctx.declared === false`(未宣言) | 判定 6 へ進む(loud にしない — FR-CLI-3 (0) の主用途) |
| 5 | `ctx.declared === true` かつ同値 → `continue`(監査イベントを増やさない)/ 異値 → `error`(`set-autonomy` 案内) | FR-CLI-2 (1) / FR-CLI-3 (1)(2)(3) |
| 6 | 値 `none` かつ `ctx.grant === "present"` | `error`(明示 revoke の案内 — grant 取消を起動フラグの側面効果にしない) |
| 7 | 値 `full` かつ `ctx.grant !== "present"` | `error` + preview を stderr へ(FR-CLI-4 fail-closed) |
| 8 | 上記以外 | `applyProductionAutonomyMode({...})` へ委譲。`ok: false` は error 文字列を relay(HUMAN_TURN 不在は `PROVENANCE_REQUIRED` — FR-CLI-5) |

判定 5・6 が判定 8 より先にあることが `prepareNonFullCommand:385-390` の `revoke-full` 経路を起動フラグから構造的に到達不能にする(FR-CLI-3 (3)、ADR-8 Consequences)。

## アルゴリズム 3 — `readLaunchAutonomyContext`(判定の基体)

`component-methods.md` §C13 の型を逐語採用。projection を **1 回だけ**読む:

```
function readLaunchAutonomyContext(projectDir: string):
  | { kind: "readable"; mode: AutonomyMode;
      declared: boolean;                  // modeProvenance.kind === "human-command"(ADR-13)
      grant: "present" | "absent" }       // currentGrant.state === "active" か
  | { kind: "unreadable" }                // readProductionAutonomyProjection が null / throw
```

`declared` を state フィールドの有無で代用しない(ADR-13 — birth が `- **Intent Autonomy Mode**: none` を必ず書くため「フィールド不在 = 未宣言」は成立しない。`amadeus-utility.ts:4635` 実測)。読取失敗を `catch → false` で保守側に倒す近傍様式(`isFullyAutonomousIntent:175-177`)は**意図的に採らない** — この文脈では `false` が緩和側へ反転するため `"unreadable"` として拒否側へ倒す(`component-methods.md` §C13 の意味論適合照合の転記)。

## データフロー

| 段 | データ | 供給元 | 消費先 |
| --- | --- | --- | --- |
| 1 | argv(`--autonomy <v>`) | 利用者の起動コマンド | `parseNextFlags`(C12) |
| 2 | `flags.autonomy` / `flags.autonomyMissingValue` | C12 | 新 Branch の発火判定 + C13 判定 1・2 |
| 3 | `stateContent`(null 可) | `loadStateFileIfPresent:2540` | C13 判定 0 と判定 8 の引数 |
| 4 | `LaunchAutonomyContext` | `readLaunchAutonomyContext`(projection 1 read) | C13 判定 3〜7 |
| 5 | mode 書込 | `applyProductionAutonomyMode`(既存 — 第 2 の書込経路を作らない、ADR-8) | 監査 + projection + state |

**directive への非搬送**(C-3): C13 は `directive.intent_autonomy_mode` へ書き込まない。directive への射影は既存 `routeMainWorkflowDirective:2192` が独占する。`amadeus-directive.ts:97` / `:606` は本 Unit の diff に現れない。

## 検証シーケンス(t449 / t450)

- **t449(C12)**: `parseNextFlags` を export 追加して in-process 駆動(D6 — `cid:code-generation:seam-export-handler-amend`)。3 値それぞれで値が `flags.intent` に混入しないこと(FR-CLI-1)、値なしで `autonomyMissingValue` が立つことを assert。落ちる実証: consume 分岐を外すと赤。
- **t450(C13)**: `applyLaunchAutonomyDeclaration` / `readLaunchAutonomyContext` を export し in-process 駆動。判定 0〜8 の分岐網羅(FR-CLI-2 (1)(2)(3)(4) / FR-CLI-3 (0)(1)(2)(3) / FR-CLI-4 / FR-CLI-5)。落ちる実証 3 点: grant 判定を無条件 `"absent"` 化 → FR-CLI-2 (2) が赤 / `declared` を無条件 `true` 化 → FR-CLI-3 (0) が赤 / fail-closed 反転 → FR-CLI-4 が赤。
- **t450 追加ケース H9(FR-CLI-5 後半)**: `READ_ONLY_FLAGS`(`amadeus-lib.ts:437` export 済み)を in-process import し `has("--autonomy") === false` を assert(business-rules.md R12 の検証手段)。
- `amadeus-orchestrate.ts` は in-process import 実績あり(実測: `tests/unit/t-batch3-orchestrate-seam.test.ts` ほか)のため spawn 盲点に入らない。実 FS(state ファイル・projection)を使うケースは integration 層へ置く(`cid:code-generation:fs-tests-integration-first`)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T10:25:48Z
- **Iteration:** 2
- **Scope decision:** none

R12の検証手段(H9)がbusiness-rules.mdとbusiness-logic-model.mdに一貫して追加され、FR-CLI-5のAC全数がテスト固定表でカバーされたためREADY

### Findings

- None
