# Scalability Requirements — U6 Installer Test Harness

> Stage: construction / nfr-requirements  
> Unit: U6 Installer Test Harness  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U6 scalability covers growth in test cases, fixture dimensions, requirement mappings, smoke commands, and CI handoff outputs. It does not cover multi-repository test orchestration, release workflow fan-out, or production telemetry.

## Capacity Targets

| Dimension | First-release target | Requirement |
|---|---:|---|
| mapped requirements/stories | 100 | registry check remains under performance target |
| installer test cases | 250 | full suite remains under CI target |
| temp target files per large fixture | 2,000 | fixture generation remains deterministic |
| fake tag entries | 500 | SemVer resolver cases cover realistic tag lists |
| reporter snapshot cases | 40 | snapshots remain reviewable |
| smoke commands | 10 | CI handoff remains fast enough for U7 |

## Scaling Constraints

- Test cases should be generated from typed fixture builders rather than duplicated ad hoc setup.
- Large fixtures must use generated assertions and minimal file contents.
- Coverage registry entries must be machine-readable and stable for U7 CI checks.
- Snapshot growth should be controlled by canonical small cases plus targeted edge cases.
- CI handoff output must remain concise enough for GitHub Actions annotations/logs.

## Growth Triggers

| Trigger | Required response |
|---|---|
| full suite exceeds 120s p95 | split U6 commands into blocking smoke and extended scheduled tests |
| snapshots become hard to review | replace broad snapshots with structured assertions plus focused snapshots |
| registry exceeds 100 mappings | introduce grouping/report summary while preserving per-requirement traceability |
| temp fixture generation dominates runtime | add fixture cache within one test process, never shared across tests unsafely |
| new harness is added | add sentinel, target-state, apply, reporter, and registry cases for that harness |

## Test Data Strategy

- Provide typed builders for tag lists, archive outcomes, distribution files, target states, manifests, plans, and apply results.
- Normalize volatile data such as timestamps, temp roots, and platform separators in snapshots.
- Keep fake GitHub and archive behavior explicit per test.
- Keep every test isolated even when fixture helpers are shared.

## Upstream Coverage

- `business-logic-model.md`: test layers, fixture workflow, and coverage registry workflow define scalability surfaces.
- `business-rules.md`: required matrix and testable invariants define capacity requirements.
- `requirements.md`: FR-004, FR-007, FR-008, FR-009, FR-013, FR-014, FR-016, NFR-001, NFR-003, NFR-004, and NFR-006 define scalable coverage needs.
- `technology-stack.md`: Bun test runner and CI commands define how scalable suites are executed.

