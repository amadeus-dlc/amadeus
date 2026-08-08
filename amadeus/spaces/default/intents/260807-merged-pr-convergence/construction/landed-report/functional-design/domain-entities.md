# Domain Entities — landed-report(functional-design)

上流入力(consumes 全数): `unit-of-work`(単一 Unit の外延)、`unit-of-work-story-map`(スライス 1〜6)、`requirements`(FR/AC)、`components`(層別責務)、`component-methods`(型契約の正本 — 本書はそれを entity 粒度で精密化)、`services`(外部境界)。

## 型定義(canonical — 実装はこの形状に一致させる)

### PrLifecycleState(predicate、新設 companion)

```ts
export type PrLifecycleState = "OPEN" | "CLOSED" | "MERGED";
// parse(raw: string): PrLifecycleState — 未知値は throw(Mergeable.parse :124-138 と同形の fail-closed)
```

### RawPrState(gh-runner、拡張)

```ts
export interface RawPrState {
  readonly mergeable: string;
  readonly mergeStateStatus: string;
  readonly state: string;                    // 追加(raw のまま)
  readonly mergedAt: string | null;          // 追加(未マージは null)
  readonly mergeCommitOid: string | null;    // 追加(未マージは null)
  readonly checkRollupState: string | null;  // 追加(rollup 不在は null)
}
```

### LandedFacts(predicate、新設)

```ts
export interface LandedFacts {
  readonly mergedAt: string;         // MERGED なのに null なら throw(機械導出必須 — AC-3a)
  readonly mergeCommitOid: string;   // 同上
  readonly checkRollupState: string | null;  // informational — null 許容
}
// LandedFacts.parse(raw: RawPrState): LandedFacts — state==="MERGED" 前提の抽出。前提違反は throw
```

### EvaluatedVerdict(predicate、新設 — ConvergenceVerdict と evaluateConvergence は**バイト不変**)

```ts
// 既存 ConvergenceVerdict(:161-166)と evaluateConvergence(:180-192)は一切変更しない(BR-8 と一致)。
// verdict 判別子は交差型の新設ラッパ型で運ぶ:
export type EvaluatedVerdict = ConvergenceVerdict & {
  readonly verdict: "converged" | "not-converged" | "landed";
};
// 純コンストラクタ2つ(predicate に新設 — 組み立て点は cli の evaluate、logic-model Step 4/6 参照):
// labeledVerdict(v: ConvergenceVerdict): EvaluatedVerdict
//   = { ...v, verdict: v.converged ? "converged" : "not-converged" }
// landedVerdict(facts: LandedFacts): EvaluatedVerdict
//   = { converged: false, verdict: "landed", violating: {repliedUnresolved:0, ignored:0},
//       mergeState: "MERGED"(表示用)、mergeableResolution は landed 非適用の表示値 }
// ※ ADR-3 の「ConvergenceVerdict へ verdict を追加」は本ラッパ型による実現へ精密化(申告 — evaluateConvergence バイト不変の Constraint を優先。ADR-3 の意図 = JSON 判別可能性は EvaluatedVerdict が満たす)
```

### ConvergenceReport(cli :61-76、第3 variant 追加)

```ts
| {
    readonly kind: "landed";
    readonly prRef: { repo: string; number: number };
    readonly mergedAt: string;
    readonly mergeCommitOid: string;
    readonly checkRollupState: string | null;
    readonly generatedAt: string;   // seams.now() 由来
  }
```

## エンティティ間の導出関係

RawPrState --(PrLifecycleState.parse)--> MERGED 判定 --(LandedFacts.parse)--> landedVerdict / landed report。OPEN/CLOSED は既存経路(resolveMergeable → evaluateConvergence)へ — 2経路は evaluate(cli.ts:355-381)の入口で排他分岐。
