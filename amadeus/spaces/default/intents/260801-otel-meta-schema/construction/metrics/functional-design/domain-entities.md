# Domain Entities — U5 metrics

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U5 の責務は unit-of-work.md U5 行(按分150行: instruments 60+meter arm 20+bootstrap meter 部 15+計測点配線 55)から、API 形は component-methods.md の metrics-instruments 節から、FR 契約は requirements.md FR-MET-1〜4 から、価値は story-map 段5から、store 境界(metrics-*.jsonl、Relay 無改変)は services.md から導出した。

## 計器定数(otel/metrics-instruments.ts — canonical 1定義)

```typescript
export const INSTRUMENTS = {
  tokenUsage:      { name: "gen_ai.client.token.usage",   kind: "histogram", attrs: ["gen_ai.token.type", "gen_ai.request.model"] },
  stageDuration:   { name: "amadeus.stage.duration",      kind: "histogram", attrs: ["amadeus.stage", "amadeus.phase"] },
  gateIterations:  { name: "amadeus.gate.iterations",     kind: "counter",   attrs: ["amadeus.stage"] },
  operationFailures:{ name: "amadeus.operation.failures", kind: "counter",   attrs: ["amadeus.operation"] },
  subagentDuration:{ name: "amadeus.subagent.duration",   kind: "histogram", attrs: ["amadeus.agent.type"] },
} as const; // #1868 §6 と 1:1。計器・属性キーはこの閉集合のみ
```

## 不変条件

- 計器名・属性キーは INSTRUMENTS 閉集合からのみ参照(リテラル命名禁止 — ADR-5)
- metrics 属性に amadeus.intent.id / amadeus.agent.id を**載せない**(低 cardinality 統制 — テストで固定)。相関は record の traceId/spanId(meter-provider の correlation 既存機構)が担う
- meter 未登録時の計測ヘルパは no-op(fail-open)— 判定機構は新設 `registeredMeterProjectDir(): string | null`(meter-provider.ts へ追加、tracer/logger の registered ペア既習形)
