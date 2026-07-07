# Tech Stack Decisions — U4 Operation Planning And Safety

> Stage: construction / nfr-requirements  
> Unit: U4 Operation Planning And Safety  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript / ESM | Matches `technology-stack.md` and installer package direction |
| Runtime | Bun | Required by `requirements.md` FR-002 and current toolchain |
| Planner shape | pure functions over command/mode/source/target snapshot | Makes safety policy deterministic and testable |
| Filesystem access | none inside planner, except injected `backupPathExists` predicate | Preserves U4 purity and testability |
| Backup timestamp | supplied once per plan by clock/application service | Ensures consistent backup names |
| Path handling | portable relative operation paths, platform APIs at adapter boundaries | Satisfies NFR-004 |
| Dependency posture | no heavy planning framework | NFR-005 dependency discipline |

## Explicit Non-Decisions

- Do not prompt.
- Do not render final CLI wording.
- Do not copy files.
- Do not write backups.
- Do not write manifests.
- Do not verify final installation.
- Do not read live target filesystem directly.

## Dependency Policy

Any runtime dependency added for planning, SemVer comparison reuse, path handling, or data validation must include:

- purpose;
- why TypeScript/Bun standard APIs are insufficient;
- license compatibility;
- package size impact;
- vulnerability scan result;
- portability notes for macOS, Linux, and Windows-compatible shells.

## CI And Tooling

U4 implementation must integrate with:

- `bun run typecheck`;
- U6 plan fixture tests for every target state and flag combination;
- U6 ordering invariant tests for backup-before-update;
- U7 coverage registry/ratchet for safety-critical branches;
- no target write assertions through pure planner tests.

## Portability Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backup timestamp | UTC basic format | Windows-safe filenames |
| Backup suffix | append `.N` before `.bk` | Deterministic collision behavior |
| Operation path | source/target relative paths stay normalized | Reporter/Applier traceability |
| Filesystem path checks | delegated predicate | Keeps platform-specific filesystem behavior outside U4 |

## Upstream Coverage

- `business-logic-model.md`: U4 planning and backup path workflows drive decisions.
- `business-rules.md`: planning, force/yes, target state, version, and backup rules drive technology constraints.
- `requirements.md`: FR-005 / FR-006 / FR-008 / FR-009 / FR-010 / FR-011 / NFR-002 / NFR-003 / NFR-004 / NFR-005 are primary constraints.
- `technology-stack.md`: TypeScript/ESM/Bun and current CI define the implementation baseline.
