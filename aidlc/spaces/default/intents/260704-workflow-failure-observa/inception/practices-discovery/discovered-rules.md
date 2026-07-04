# Discovered Rules

## Mandated

ALWAYS GitHub Issue と Intent artifacts を接続し、phase gate ごとに validator と検証結果を記録する。
ALWAYS treat validator pass as structural validation only, not content approval or merge approval.
ALWAYS build the first Bolt as a vertical slice covering #431 engine error audit, #432 hook drop doctor, and OpenTelemetry no-op default instrumentation.
ALWAYS add a failing eval or deterministic test before implementation when changing `.agents/aidlc/tools` behavior.
ALWAYS verify `npm run test:all`, the target Intent validator, parity, stdout JSON contract, and OpenTelemetry no-op default no-send before PR readiness.
ALWAYS resolve CI failures before acting on review comments during PR monitoring.
ALWAYS keep TypeScript changes compatible with strict typecheck.

## Forbidden

NEVER treat collector or dashboard deployment as required for the core OpenTelemetry instrumentation scope.
NEVER write debug logs into stdout paths that are part of the JSON directive/report contract.
NEVER edit `skills/` directly for this Intent because it is a distribution boundary.
NEVER change `.coderabbit.yml` or `.coderabbit.yaml` without explicit human permission.
NEVER bypass source skill, promoted skill, host harness, and Intent artifact boundaries.
NEVER preserve backward compatibility unless an explicit compatibility target exists.
