# Tech Stack Decisions — U5 Apply Verify And UX

> Stage: construction / nfr-requirements  
> Unit: U5 Apply Verify And UX  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Bun-first TypeScript | Matches `technology-stack.md` and requirements CON-002. |
| File IO boundary | `FileSystemPort` or equivalent adapter | Allows temp-fixture tests and fault injection for backup/copy/manifest failure. |
| Apply orchestration | Application Service owns sequencing | Matches `business-logic-model.md` integration boundary and avoids hidden policy recalculation. |
| Manifest write | atomic temp-file plus rename adapter | Required by BR-U5-012 and FR-013 traceability. |
| Prompt IO | `PromptPort` spyable adapter | Enforces `--yes` and non-TTY prompt suppression. |
| Reporter | deterministic plain-text renderer over structured results | Satisfies `requirements.md` NFR-006 and snapshot testing. |
| Verification | manifest-entry existence checks plus doctor-equivalent readiness checks | Satisfies FR-014 without introducing a separate `doctor` subcommand. |
| Rollback | no rollback workflow in first release | Out of scope; reliability comes from backups and partial-apply diagnostics. |

## Dependency Policy

- Prefer Bun standard APIs and Node-compatible standard modules available under Bun.
- Do not add a runtime dependency for table rendering unless snapshot readability cannot be maintained with local formatting.
- Do not add a prompt library unless native terminal handling becomes materially unsafe; any prompt dependency must be documented under `requirements.md` NFR-005.
- Do not add filesystem transaction libraries for first release; use explicit backup records and atomic manifest write.

## Test And Tooling Decisions

| Area | Tooling |
|---|---|
| unit tests | Bun test runner |
| filesystem integration tests | temporary directories under test harness control |
| reporter checks | snapshot tests for canonical small cases |
| performance checks | Bun microbenchmarks or CI smoke benchmarks with fixture limits |
| fault injection | fake ports for backup, copy, manifest, prompt, and verification failures |
| portability | path API fixtures for spaces and separator behavior |

## Interfaces To Keep Stable

- `ApplyResult` discriminated outcome with `ok`, failed phase, failed operation, completed operations, backup records, and manifest write status.
- `VerificationResult` with passed and failed check names.
- Reporter input models for plan, no-write, partial apply, manifest failure, verification failure, and success.
- Prompt Adapter contract that can be asserted unused when prompts are disallowed.
- Manifest Store contract that writes atomically and returns classified failure.

## Alternatives Rejected

| Alternative | Reason |
|---|---|
| Recalculate U4 policy in U5 | Creates drift between report and mutation behavior. |
| Write manifest before copying files | Would make failed apply look installed to future upgrade. |
| Automatic rollback after partial failure | Out of scope and risks damaging user backups/customizations. |
| JSON-only output for first release | Conflicts with default human-readable CLI requirement. |
| Parallel copy by default | Complicates deterministic ordering and backup dependency evidence. |

## Upstream Coverage

- `business-logic-model.md`: U5 boundaries require adapter-based apply, manifest, prompt, reporter, and verification.
- `business-rules.md`: testable invariants drive the fake-port and snapshot strategy.
- `requirements.md`: FR-001, FR-002, FR-008, FR-009, FR-010, FR-011, FR-013, FR-014, NFR-002, NFR-003, NFR-004, NFR-005, and NFR-006 define technology constraints.
- `technology-stack.md`: Bun, TypeScript, existing CI, and distribution structure are the baseline.

