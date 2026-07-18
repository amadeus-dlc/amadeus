# Domain Entities — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 型(すべて amadeus-swarm.ts 内 — C1 単一始点、貧血型でも全面 static 寄せでもない判別 union の既決 style)

```ts
type DriverName = "subagent" | "claude-ultra" | "codex-ultra";
const DRIVER_VALUES: readonly DriverName[] = ["subagent", "claude-ultra", "codex-ultra"];

type HarnessName = "claude" | "codex" | "kiro" | "kiro-ide";
const HARNESS_VALUES: readonly HarnessName[] = ["claude", "codex", "kiro", "kiro-ide"];

type DriverResolution =
  | { kind: "selected"; driver: DriverName }
  | { kind: "degraded"; driver: "subagent"; requested: DriverName }
  | { kind: "rejected"; raw: string; reason: "unknown-value" };
```

## 不変条件

- 無効状態は表現不能(parse-don't-validate): rejected は raw を保持し、driver フィールドを持たない — 呼び出し側が誤って dispatch に使えない
- `FailureReason`(:84)・referee 型は不変
- HARNESS_VALUES は `--harness` CLI 検証の実行時配列(型 union だけでは落ちる実証が runtime 消去で偽陰性になる — inject-runtime-consumed-lines の予防設計)
