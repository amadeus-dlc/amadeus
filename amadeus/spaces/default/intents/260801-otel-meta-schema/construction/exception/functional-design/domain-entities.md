# Domain Entities — U3 exception

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U3 の責務は unit-of-work.md U3 行(按分95行: tracer recordException 部 20+redaction 60+registry exception 部 15)から、API 形は component-methods.md の redactStacktrace / recordException 節から、FR 契約は requirements.md FR-EXC-1〜4 から、価値は story-map 段3(バグ改修の直接材料)から、store 境界は services.md から導出した。

## 型

```typescript
// otel/redaction.ts 追加分 — 承認済み component-methods.md:26 のシグネチャを維持。
// 新規公開型は導入しない(戻り値は redaction 済み文字列そのもの)。
export function redactStacktrace(stack: string, repoRoot: string): string;
```

## registry 拡張(event-registry.ts:827-835 の exception def)

- requiredAttributes: ["exception.message"](不変)
- optionalAttributes: [] → **["exception.type", "exception.stacktrace"]**(safe-key は redaction.ts:65-71 の機械導出で自動追従 — 実測済みの既存機構)

## 不変条件

- exception イベントの durability = telemetry は不変(FR-EXC-4 — recordException 内の実行時検査 tracer-provider.ts:151-154 と drift guard が既に固定)
- stacktrace は redactStacktrace の戻り値(redaction 済み **string**)のみが addEvent に到達する(未処理 stack が span record へ届く経路を作らない — 型定義と一致)
