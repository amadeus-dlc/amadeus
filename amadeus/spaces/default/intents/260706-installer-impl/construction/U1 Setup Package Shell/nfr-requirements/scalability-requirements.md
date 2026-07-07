# Scalability Requirements — U1 Setup Package Shell

> Stage: construction / nfr-requirements  
> Unit: U1 Setup Package Shell  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U1 is a local single-process CLI shell. It has no backend service, daemon, queue, database, or horizontal scaling surface. Scalability requirements therefore focus on invocation volume in CI/scripts, package size discipline, and keeping startup cost independent of target project size.

## Capacity Targets

| Dimension | Requirement |
|---|---|
| Explicit harness/target values | at most one explicit `--harness` and at most one explicit `--target` per process |
| Missing harness/target values | preserved as absent fields in `SetupCommand`; downstream prompt/validation owns completion |
| Parallel invocations | independent processes must not share mutable U1 state |
| Target project size | help and parser paths must be O(1) with respect to target project file count |
| Harness count | parser supports exactly `claude`, `codex`, `kiro`, `kiro-ide`; adding harnesses requires explicit parser/test/docs update |
| Package contents growth | package dry-run must report unexpected files before publish |

## Scaling Triggers

U1 design must be revisited if any of these become true:

- Node-only runtime compatibility becomes a release requirement.
- One invocation needs to install multiple harnesses.
- CLI startup begins importing U2-U5 adapters on help or invalid input paths.
- Package size grows because release artifacts include repository-local state or generated test fixtures.
- Docs introduce additional command aliases such as `init`.

## Concurrency Requirements

- U1 keeps no persistent process-global state between invocations.
- U1 does not create locks.
- U1 does not write target files, so it does not need file-level concurrency control.
- Downstream apply concurrency and backup collisions are owned by U4/U5, not U1.

## Growth Guardrails

- Every new command must be explicitly listed in help, parser tests, docs, and package gate checks.
- Runtime dependencies are not added for single-use parsing convenience unless justified under NFR-005.
- Help text should stay deterministic and snapshot-testable.
- Parser scalability does not require `--harness` or `--target` to be present in interactive mode. It only rejects duplicate explicit values and unsupported values.

## Upstream Coverage

- `business-logic-model.md`: One-process startup and command parsing workflows define the scaling model.
- `business-rules.md`: one-harness-per-invocation and package allowlist rules define capacity boundaries.
- `requirements.md`: FR-003 / FR-004 / FR-011 / NFR-005 define layout and dependency growth constraints.
- `technology-stack.md`: local Bun/TypeScript toolchain and no root runtime dependencies inform scalability posture.
