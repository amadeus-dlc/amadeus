# Monitoring Design — U5 Apply Verify And UX

> Stage: construction / infrastructure-design  
> Unit: U5 Apply Verify And UX

## Observability Scope

U5 has no hosted monitoring stack. Observability is deterministic plain-text output, structured result fields, fake-port call traces in tests, and GitHub Actions evidence. No telemetry is sent from user machines.

## Runtime Signals

| Signal | Producer | Purpose |
|---|---|---|
| pre-apply report emitted | Reporter | prove plan is shown before mutation |
| prompt decision | PromptAdapter | classify confirmation accepted/declined/skipped |
| applied operations | FileApplier | partial/success evidence |
| backup records | FileApplier | user customization preservation evidence |
| failed phase and operation | FileApplier / ResultClassifier | diagnose backup/copy failure |
| manifest write status | ManifestStore / ResultClassifier | distinguish applied-but-manifest-failed target |
| verification check names | Verifier | diagnose readiness failures |
| final exit classification | ResultClassifier | stable CLI and test contract |

## CI Evidence

| Gate | Evidence |
|---|---|
| type/lint scope | root `bun run typecheck` and `bun run lint` fail on `packages/setup/**/*.ts` errors |
| no-write tests | `canApply:false` and declined confirmation call no mutating ports |
| call-order tests | pre-apply report before mutation; backup before copy; manifest after apply |
| fault injection tests | backup failure, copy failure, manifest write failure, verification failure |
| reporter snapshots | stable no-write, plan, success, and failure output |
| portability fixtures | target paths with spaces and platform separators |
| package parity checks | `dist:check` and `promote:self:check` when installer source affects generated/self-installed trees |

These checks should be blocking because U5 owns the actual target mutation boundary.

## User-Facing Diagnostics

Reporter output includes:

- no-change guarantee for no-write paths;
- concrete next action for classified errors;
- backup paths when backups are planned or written;
- failed phase/operation for apply failures;
- manifest path for manifest-write failures;
- failed verification check names;
- success summary with harness, version, tag, target, manifest path, and next steps.

Reporter output must not include file contents, environment dumps, secret-like values, or long raw OS errors.

## Incident Response

Maintainers diagnose U5 failures from:

- structured `SetupResult`;
- fake-port call trace;
- temp-dir fixture state;
- reporter snapshot diff;
- GitHub Actions logs.

Runtime rollback is not an incident response mechanism in U5. If apply partially succeeds, U5 reports completed operations and backup records so the user and maintainer can reason about recovery.

## Upstream Coverage

- `performance-design.md`: benchmark summaries and call traces cover render/apply/manifest/verification budgets.
- `security-design.md`: observability preserves no-write proof, prompt suppression, backup evidence, and minimization.
- `scalability-design.md`: signals remain bounded for 2,000 operations and 500 backups.
- `reliability-design.md`: result states and diagnostics contract become observable signals.
- `logical-components.md`: Reporter, PromptAdapter, FileApplier, ManifestStore, Verifier, and ResultClassifier produce the signals.
- `components.md`: Reporter consumes structured results without inspecting target filesystem.
- `services.md`: GitHub Actions PR gates and local CLI output are the monitoring substrate.
- `business-logic-model.md`: Apply, Manifest, Verification, Reporter, and Error Handling define signal points.
