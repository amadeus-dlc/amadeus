# Reliability Requirements — U1 Setup Package Shell

> Stage: construction / nfr-requirements  
> Unit: U1 Setup Package Shell  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U1 reliability means deterministic CLI startup, stable exit codes, clear error output, and no accidental side effects before downstream units run. U1 has no availability SLA because it is not a service, but its failure modes must be predictable for humans and CI.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| Help path | exits 0, stdout contains only supported command names, no target access | smoke snapshot |
| `init` command | exits non-zero with `unsupported-command`, no delegation | parser unit test |
| Bun absent through `npx` | exits non-zero with Bun-required message | wrapper smoke test |
| Unexpected top-level exception | exits non-zero with classified fallback error | entrypoint unit test |
| Application service returns `ExitResult` | process stdout/stderr/code mirror result exactly | integration test with fake service |

## Failure Handling

- Parser errors are deterministic and classified.
- Runtime errors before Bun is available are rendered by the wrapper without importing downstream modules.
- Unknown exceptions are caught at the process boundary and mapped to human-readable stderr.
- U1 does not retry. Retry belongs to U2 archive fetch or downstream external operations.
- U1 never performs rollback because U1 does not mutate target files.

## No-Write Reliability

For help, invalid command, unsupported harness, duplicate harness, and Bun-required paths:

- no target file read;
- no target file write;
- no archive fetch;
- no manifest read/write;
- no prompt for target mutation confirmation;
- no application-service delegation on grammar/runtime failure.

This requirement directly implements `business-rules.md` BR-U1-012 and `requirements.md` FR-011 no-change behavior.

## Observability And Diagnostics

- Error output uses stable error codes: `unsupported-command`, `unknown-command`, `duplicate-harness`, `unsupported-harness`, `bun-required`.
- Diagnostics include one next action where useful.
- Diagnostics do not include stack traces by default for user errors.
- CI snapshots assert help/error wording so docs and CLI do not drift.

## Portability Reliability

U1 must satisfy `requirements.md` NFR-004 for the package shell and wrapper paths.

| Portability surface | Requirement | Verification |
|---|---|---|
| macOS shell | Bun direct bin and npm wrapper preserve argv array and stdio | CI or local smoke lane when available |
| Linux shell | GitHub Actions Ubuntu runner executes Bun direct, local package bin, and PATH-without-Bun wrapper tests | required CI smoke lane |
| Windows-compatible shell | Wrapper logic avoids POSIX-only shell concatenation and path separators; tests cover argv array construction and PATH lookup with Windows-style separators | unit tests runnable on any OS plus optional Windows CI lane |
| npm bin shim | Node/npm wrapper handles npm-created bin invocation without assuming POSIX shebang behavior beyond package manager contract | package dry-run and wrapper smoke |
| Bun discovery | PATH lookup is deterministic and treats missing Bun as `bun-required`, not unknown shell failure | PATH fixture smoke |

Portability verification must include arguments with spaces in `--target` values to prove argv array preservation. U1 does not inspect that target path; it only preserves the value for downstream units.

## Upstream Coverage

- `business-logic-model.md`: Decision tree defines reliability outcomes for each startup/parse path.
- `business-rules.md`: Validation outcomes and testable invariants define pass/fail conditions.
- `requirements.md`: FR-001 / FR-002 / FR-004 / FR-011 define user-visible reliability behavior.
- `requirements.md`: NFR-004 defines macOS, Linux, and Windows-compatible shell portability.
- `technology-stack.md`: Bun-based CI and package scripts define how reliability checks run.
