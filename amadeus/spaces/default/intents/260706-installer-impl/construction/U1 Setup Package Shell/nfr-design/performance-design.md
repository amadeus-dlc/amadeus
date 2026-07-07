# Performance Design — U1 Setup Package Shell

> Stage: construction / nfr-design  
> Unit: U1 Setup Package Shell  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U1 performance is achieved by a thin startup path: runtime detection, argv normalization, command parsing, help/error rendering, and optional application-service delegation. The help and invalid-input paths are isolated from U2-U5 adapters so they cannot pay network, archive, target snapshot, planning, or apply import cost.

## Startup Budget Design

| Path | Design choice | Budget protected |
|---|---|---|
| Bun direct help | load parser/help/reporter only | p95 <= 300ms |
| local package/bin help | package shell delegates to the same help renderer | p95 <= 750ms |
| invalid command | parser returns classified error before service construction | p95 <= 300ms |
| duplicate/unsupported harness | parser validates enum and cardinality in memory | p95 <= 300ms |
| Node/npm wrapper without Bun | wrapper performs fixed PATH lookup and exits | p95 <= 500ms |

## Module Loading Strategy

- `bin` wrapper module owns runtime detection and safe delegation only.
- parser/help/error modules have no imports from source resolver, target detector, planner, applier, manifest store, prompt adapter, or GitHub clients.
- application service is imported only after parser returns a valid `install` or `upgrade` command under Bun.
- package metadata checks run in maintainer scripts, not in user help path.

## Measurement Hook Design

U6 smoke and unit tests measure the scenarios from `performance-requirements.md`:

- direct Bun help;
- package/bin help;
- `amadeus-setup init`;
- duplicate `--harness`;
- unsupported harness;
- Node/npm wrapper with Bun hidden from PATH.

Each measurement asserts functional output before classifying a timing failure. This preserves `reliability-requirements.md` behavior where wrong output is a reliability failure, not merely a slow command.

## Optimization Guardrails

- Do not add caching, connection pooling, or async job machinery in U1; there is no backend or repeated in-process workload.
- Do not pre-resolve `--target` or inspect target file counts.
- Do not eagerly build source distribution or manifest objects on help/error paths.
- Do not add table-rendering or CLI framework dependencies for help text unless `tech-stack-decisions.md` dependency rationale is satisfied.

## Upstream Coverage

- `performance-requirements.md`: startup, help, invalid command, duplicate harness, and wrapper timing targets drive this design.
- `security-requirements.md`: no target access and safe delegation constrain optimization choices.
- `scalability-requirements.md`: O(1) parser/help behavior and no shared state define scale posture.
- `reliability-requirements.md`: output correctness precedes timing classification.
- `tech-stack-decisions.md`: Bun-first TypeScript and minimal dependency policy define implementation options.
- `business-logic-model.md`: Startup, help, parse, and delegation workflows define where performance boundaries sit.

