# Reliability Design — U1 Setup Package Shell

> Stage: construction / nfr-design  
> Unit: U1 Setup Package Shell  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U1 reliability is deterministic process behavior: stable exits, stable stdout/stderr mapping, classified errors, no downstream delegation on grammar/runtime failure, and no target side effects on help/error paths.

## Outcome Design

| Scenario | Exit/output design | Side-effect design |
|---|---|---|
| help/no command | exit 0, help lists `install` and `upgrade` only | no target access |
| `init` | non-zero `unsupported-command`, next action uses `install` | no delegation |
| unknown command | non-zero `unknown-command`, next action uses `--help` | no delegation |
| duplicate harness | non-zero `duplicate-harness` | no target access |
| unsupported harness | non-zero `unsupported-harness` with supported list | no target access |
| Bun absent through npm wrapper | non-zero `bun-required` | no downstream import |
| application service result | mirror `ExitResult` stdout/stderr/code exactly | service owns downstream effects |

## Error Boundary Design

- Parser and runtime failures become classified `SetupError` values.
- User errors omit stack traces by default.
- Unexpected top-level exceptions map to a fallback error and non-zero exit.
- The entrypoint catches errors at the process boundary and keeps stdout/stderr separation stable.
- U1 does not retry; retry belongs to external operations in later units.

## No-Write Proof Design

U6 tests prove no-write behavior with fake filesystem and service spies:

- help and parser errors do not call filesystem ports;
- grammar/runtime failures do not instantiate or call the application service;
- wrapper failure path does not import downstream modules;
- target strings with spaces are preserved as argv values only.

## Portability Design

- PATH lookup uses platform delimiter semantics.
- wrapper spawn uses argv array and inherited stdio.
- parser accepts target strings without separator normalization.
- tests cover Windows-style separators and paths with spaces without requiring a Windows-only implementation path.
- optional Windows CI can be added later, but Ubuntu CI plus platform-neutral unit tests are the first-release floor from `tech-stack-decisions.md`.

## Upstream Coverage

- `performance-requirements.md`: timing evidence is coupled to correct output and no target access.
- `security-requirements.md`: no secret leakage and safe delegation are reliability requirements.
- `scalability-requirements.md`: stateless process behavior supports repeatable parallel invocation.
- `reliability-requirements.md`: scenario targets, failure handling, no-write, diagnostics, and portability define this design.
- `tech-stack-decisions.md`: Bun wrapper and parser decisions define the reliability implementation.
- `business-logic-model.md`: decision tree and data transformations define U1 outcomes.

