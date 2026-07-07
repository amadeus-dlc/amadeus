# Scalability Design — U1 Setup Package Shell

> Stage: construction / nfr-design  
> Unit: U1 Setup Package Shell  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U1 has no service scaling surface. Scalability design therefore means bounded CLI startup cost, stateless process behavior, explicit command/harness growth controls, and package size discipline.

## Capacity Design

| Capacity surface | Design |
|---|---|
| explicit harness/target values | parser records at most one explicit value and rejects duplicates |
| missing harness/target values | `SetupCommand` preserves absence for downstream prompt/validation |
| target project size | help/parser paths never inspect target tree, so behavior is O(1) relative to target files |
| parallel invocations | independent processes share no mutable U1 state |
| harness list | supported harness enum is explicit and must be updated with tests/docs |
| package contents | package dry-run reports unexpected files before publish |

## Growth Design

- New public commands require parser, help snapshot, docs, package gate, and smoke test updates.
- New harnesses require enum update, duplicate/unsupported tests, docs update, and downstream target/apply coverage.
- Node-only runtime support requires a separate design because current U1 delegates Node/npm invocation to Bun.
- Multiple harnesses per invocation are intentionally outside U1 capacity.
- Package size growth is controlled by `files` allowlist and dry-run report, not by runtime filtering.

## State And Concurrency

U1 keeps all state in local function scope for one process invocation:

- no daemon;
- no lock files;
- no cache directory;
- no global mutable parser registry;
- no filesystem writes;
- no shared target operation state.

Downstream apply concurrency, backup collision behavior, and manifest atomicity are outside U1 and remain in U4/U5.

## Upstream Coverage

- `performance-requirements.md`: startup and parser timings define the bounded growth budget.
- `security-requirements.md`: no target access and package allowlist constrain capacity mechanisms.
- `scalability-requirements.md`: explicit capacity targets and growth triggers are implemented directly here.
- `reliability-requirements.md`: stateless no-write behavior supports parallel invocation reliability.
- `tech-stack-decisions.md`: minimal parser dependency and package validation decisions define growth controls.
- `business-logic-model.md`: single-process startup and delegation workflows define the scaling model.

