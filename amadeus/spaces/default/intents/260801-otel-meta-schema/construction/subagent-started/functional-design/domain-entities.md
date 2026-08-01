# Domain Entities — U4 subagent-started

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U4 の責務は unit-of-work.md U4 行(按分195行: hook 100+registry pin 部 15+lifetime 80)から、API 形は component-methods.md の subagent-start hook / subagent-lifetime 節から、FR 契約は requirements.md FR-SUB-1〜3 から、価値は story-map 段4(未完了の機械検知)から。本 Unit は store を読む(lifetime 合成)が新 store を作らない — その境界は services.md に依拠する。

## registry 追加(canonical 79 化)

```typescript
// event-registry.ts へ追加(U3 の exception 属性追加の後に積む — DAG エッジ exception → subagent-started、正準 YAML は subagent-started: depends_on: [exception])
{
  name: "amadeus.subagent.started",
  auditEvent: "SUBAGENT_STARTED",
  durability: "canonical",
  category: "subagent",
  requiredAttributes: ["Agent Type"],
  optionalAttributes: ["Agent ID", "Purpose"],
  schemaVersion: 1,
}
```

**canonical 追加で触るガード全数(codekb §9 の10項目 — 同一 PR で全て green 化)**:
1. event-registry.ts:77 EXPECTED_CANONICAL_COUNT(78→79)
2. event-registry-drift.test.ts:50-54 の4値 pin
3. t28-audit-event-sync.test.ts:72,175 の2値 pin
4. amadeus-audit.ts VALID_EVENT_TYPES 本体
5. t-otel-event-registry.test.ts(FR-EVT-7 全数契約)
6. t381-registry-emitter-parity.test.ts(emitter/registry パリティ)
7. t385-emitter-registry-admission.test.ts(static admission — 新 hook の call site が解析可能であること)
8. t48-audit-event-emitters.test.ts(emitter 網羅)
9. event-registry-drift sensor(manifest+amadeus-sensor-event-registry-drift.ts)
10. event-registry.ts assertRegistryConsistent(:883-897 runtime self-check)

加えて **doc 同期**: knowledge/amadeus-shared/audit-format.md(イベント語彙表)と docs/reference/12-state-machine.md のイベント一覧更新をタスク化する。落ちる実証: pin 1箇所残しで対応ガードが赤

## lifetime 合成型(otel/subagent-lifetime.ts)

```typescript
export type SubagentLifetime = Readonly<{
  agentType: string;
  agentId: string | null;
  startedAt: string;              // ISO(started 行)
  completedAt: string | null;     // null = 未完了(idle 死候補)
  incomplete: boolean;            // completed 欠落
}>;
```

## 不変条件

- SUBAGENT_STARTED は canonical(監査に永続 — telemetry ではない。#1868 §5 の裁定どおり)
- Purpose は prompt の**先頭1行**を **200字**へ切詰めたもの(SubagentStop の Message 200字既習形と同値。1行抽出後の残存改行エスケープ表現も除去)+redaction 対象(registry 経由で safe-key 自動追従)
