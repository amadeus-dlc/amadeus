# Domain Entities — U4-engine-boundary(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 新規エンティティ(amadeus-orchestrate.ts 内部)

### `MirrorBoundaryDecision`(phase 境界での分岐結果)

```
type MirrorBoundaryDecision =
  | { kind: "ask"; includeCreate: boolean }   // auto off/未設定、または auto on×ミラー未作成(E-MPRRA2 降格)
  | { kind: "auto-sync" };                     // auto on×ミラー作成済み → sync print(run-then-continue)
```

> 2値のみ(reviewer i1 M1 の是正): 冪等ケース(本境界で発火済み)は**導出関数を呼ぶ前の外側ガード**(business-logic-model の早期リターン)で処理し、型には現れない — 2入力(resolve 結果+state 読取)の純関数契約と一致。config invalid も導出前の loud エラー(BR-U4-3)で型に現れない。

- `includeCreate` = ミラー未作成(state に Mirror Issue フィールド不在)のとき true(S-05)
- 決定入力: (a) U3 `resolve()` の MirrorConfig(autoMirror)(b) state の Mirror Issue フィールド有無(getField 読取)— いずれも決定的読取のみ

### 既存語彙の再利用(新 kind なし — C-04)

ask 分岐は既存 `ask` directive、auto-sync は既存 `print`(run-then-continue)を発行する。新しい directive kind・新しい状態機械状態を導入しない。境界検出は `PHASE_CHECK_REQUIRED_PHASES`(amadeus-state.ts:165-169)の canonical 参照。

## エンティティ間関係

MirrorBoundaryDecision は next の phase boundary 経路で1回だけ導出される純関数の結果(resolve 結果+state 読取 → 決定)。close は本決定空間に**現れない**(ADR-3 — SKILL/手動が唯一の close 導線)。
