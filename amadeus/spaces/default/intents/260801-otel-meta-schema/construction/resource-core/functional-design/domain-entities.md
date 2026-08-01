# Domain Entities — U1 resource-core

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U1 の責務境界は unit-of-work.md の U1 行(按分 350行)から、API 形は component-methods.md の resource.ts / resource-suppliers.ts 節から、FR 契約は requirements.md FR-RES-1〜4 から、価値文脈は story-map 段1から、store/Relay 境界は services.md から導出した。

## 型(functional-domain-modeling-ts スタイル — type+コンパニオン、判別 union)

```typescript
// otel/resource.ts
export type ResourceBag = Readonly<Record<string, string>>; // 完成形の resource(省略キーは不在)

// otel/resource-suppliers.ts
export type SuppliedResourceKey =
  | "amadeus.harness.version"
  | "gen_ai.request.model"
  | "session.id"
  | "amadeus.agent.role"; // 閉集合(#1868 §1 の supplier 供給4キー) — 任意キー注入は型と実行時の両方で拒否

export type SupplyOutcome =
  | { readonly kind: "accepted" }
  | { readonly kind: "duplicate"; readonly key: SuppliedResourceKey }; // 二重設定は throw(ADR-2)— outcome 型はテスト seam 用
```

## 不変条件

- ResourceBag のキーは **14属性の閉集合の部分集合**(中立8+vcs2+supplier4 — 機械合算 8+2+4=14。解決不能キーは**不在** — null/空文字を置かない = parse-don't-validate)
- supplier キーは SuppliedResourceKey 閉集合のみ。closed-set 検査は実行時にも行う(fail-closed 側)
- 値はすべて string(OTel resource 契約)。credential 形は redaction 済みでのみ store に到達(FR-RES-4)
