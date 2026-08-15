# Domain Entities — unit config-visibility(U7 / C7 + C8 / FR-7 + FR-8)

## AutonomyStatusFacet(新規、U8 命名は component-methods.md の戻り値型を明示化 — refine)

component-methods.md C8 は戻り値を匿名オブジェクト型で示すのみなので、命名して固定する:

```ts
type AutonomyStatusFacet = {
  readonly mode: AutonomyMode;                    // 宣言 Intent Autonomy Mode(既存 projection 由来。none/semi/full)
  readonly projection: "autonomous" | "gated";     // Construction Autonomy Mode 相当(U5/U6 投影関数由来)
  readonly interactive: boolean;                   // U2 SessionInteractivity.interactive の直結
  readonly mirrorConsent: MirrorMode;              // "off" | "prompt" | "auto"(改名後 intent-mirror.github.issue.consent の実効値)
  readonly findingConsent: MirrorMode;             // 改名後 finding.github.issue.creation.consent の実効値
};

function statusAutonomyFacet(projectDir: string): AutonomyStatusFacet;
```

- `AutonomyMode`・`MirrorMode` は既存型(それぞれ `amadeus-intent-autonomy.ts:11`、`amadeus-mirror-types.ts` 相当)を再利用する。新しい列挙は作らない
- 各フィールドは対応する既存/他 unit の実効関数の戻り値をそのまま写す — この型自体は集約のための「箱」であり、独自の妥当性判定ロジックを持たない(business-rules.md R-6)

## SoloElectionTriggerMode(既存型の再利用、値域は不変)

```ts
type SoloElectionTriggerMode = "manual" | "auto";   // 既存(amadeus-config.ts の型) — config leaf ではなくなるが型自体は残す

function deriveSoloElectionTrigger(mode: AutonomyMode): SoloElectionTriggerMode;
```

- 型自体(`"manual" | "auto"` の2値)は既存 `parseElectionMode` が使っていたものと同一 — 変更するのは「どこから値が来るか」(config leaf → 純関数)であって値域ではない

## AMADEUS_CONFIG_REGISTRY エントリの改廃(型ではなくデータの変更)

- **削除**: `path: "solo-election.trigger.mode"` のエントリ(現行 `amadeus-config.ts:602-613`)。`AmadeusConfigKey` union からもこのリテラルを除く
- **改名**: `path: "intent-mirror.github.issue.mode"` → `"intent-mirror.github.issue.consent"`(:585 のエントリの `path` フィールドのみ変更、`legacy` は既存の `auto-mirror` に加え旧 `.mode` 名も legacy 化)。`finding.github.issue.creation.mode` → `finding.github.issue.creation.consent` も同様(:615)
- **`resolvedConfig` の出力形**: `AmadeusConfig.intentMirror.github.issue` の TypeScript フィールド名を `mode` → `consent` に改名するかどうかは、C7 の「値語彙は不変」の範囲を超える構造改修であり、本 FD は「config キー名と表示・エラーメッセージの語彙は一致させる」(UI 真実性)ことのみを要求し、内部 TS フィールド名の改称有無は code-generation の実装判断に委ねる(handoff。ADR-8 は config path の改名は指示するが `AmadeusConfig` 型内部のプロパティ名までは指定していない)

## 本 unit が扱わないもの(スコープ外の明示)

- **`deriveSoloElectionTrigger` の呼出し側実装**(`amadeus-election.ts`, `amadeus-orchestrate.ts:4139`): 型・関数は本 unit が新設するが、消費側の書き換えは owned files 外(business-rules.md R-8)
- **投影関数そのもの**(`projectConstructionAutonomy`, `detectProjectionDivergence` — C6/U5 所有): `AutonomyStatusFacet.projection` はこれらの戻り値を写すだけで、投影ロジック自体は再実装しない
- **対話性判定そのもの**(`resolveSessionInteractivity` — C3/U2 所有): 同様に写すだけ
- **statusline の1行表示フォーマット全体の再設計**: 本 unit が追加するのは非対話マーカーのみで、既存の `@<mode>` セグメント・進捗バー等のレイアウトには手を加えない(business-logic-model.md「(B) C8」処理フロー参照)
