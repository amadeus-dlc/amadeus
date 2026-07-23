# Domain Entities — U3-mirror-config(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

> スタイル: functional-domain-modeling-ts。パーサは amadeus-settings.ts の fail-closed 様式(unknownKeyError/typeMismatchError :43-47)を踏襲(ADR-4)。

## 新規エンティティ(実装モジュール = amadeus-mirror-config.ts)

### `MirrorConfig`(解決済み設定 — parse 済みの証明を型で運ぶ)

```
type MirrorConfig = { autoMirror: boolean };
```

- 合法キーは `auto-mirror`(boolean)のみ(C-06/FR-4)。default: `{ autoMirror: false }`

### `ConfigParseResult`(1面の parse 結果)

```
type ConfigParseResult =
  | { kind: "parsed"; partial: Partial<MirrorConfig>; source: ConfigLayer }
  | { kind: "absent"; source: ConfigLayer }              // ファイル不在 = 正常(空層)
  | { kind: "invalid"; source: ConfigLayer; errors: string[] };  // 未知キー/型不整合/JSON 破損の全列挙
```

### `ConfigLayer`(層の識別)

```
type ConfigLayer = "global" | "space" | "intent";
```

- パス写像: global → `amadeus/config.json` / space → `amadeus/spaces/<space>/config.json` / intent → `<record>/config.json`(ADR-4)

### `ResolveOutcome`(3層解決の結果)

```
type ResolveOutcome =
  | { kind: "resolved"; config: MirrorConfig }
  | { kind: "invalid"; errors: { layer: ConfigLayer; errors: string[] }[] };  // invalid 層が1つでもあれば全体 invalid(fail-closed)
```

- provenance フィールドは**持たない**(reviewer i1 Major の是正): production 消費者が upstream 契約(component-methods C3 / services C3→C4)に存在しないため、消費されない検証用フィールドは作らない(検証劇場 Forbidden)。層優先の正しさは、テストで観測可能な最終値だけで assert する。**fixture 値の選定制約(必須)**: 各テストケースで「勝つべき層の値」が (a) default(false)と異なり、かつ (b) 同ケース内に共存する他の提示層の値とも異なること — boolean 1キーでは3層への固定値一律割当が構造的に盲点(intent-only / global+intent で default と同値化)を作るため、**最優先の提示層に true・他の提示層に false** をケースごとに割り当てる(例: intent-only は intent=true / global+intent は intent=true, global=false / global-only は global=true)。8 通りの提示/不在パターン全数をこの規則で構成する

## エンティティ間関係

resolve = 3面の ConfigParseResult を **global→space→intent の順にマージ(下位優先 = 後勝ち、C-06)** する純関数。absent 層はスキップ、invalid 層が1つでもあれば全体 invalid(fail-closed — 無視して進まない。FR-4 受け入れ基準)。
