# Pi M1-M10 conformance trace

This table binds the approved Pi scope milestones to their requirements and
canonical executable evidence. A referenced test that is skipped because Pi,
a provider, credentials, or an OS is unavailable remains useful CI inventory,
but the skip is not formal completion evidence. Formal green additionally
requires an evidence document accepted by
`scripts/pi-conformance-evidence.ts` and
`tests/conformance/pi-formal-evidence.schema.json`.

| Milestone | Approved scope | Requirements | Canonical executable evidence |
|---|---|---|---|
| M1 | Pi harness definition: manifest, orchestrator skill, question annex, trust/onboarding, session skills, and stage runners | FR-HAR-001, FR-HAR-002, FR-HAR-003 | `tests/unit/t-pi-harness-manifest.test.ts`; `tests/smoke/t-pi-dist-structure.test.ts`; `tests/unit/t123-skills-spec-conformance.test.ts` |
| M2 | Extension lifecycle adapter maps session, input, agent, tool, and compaction events to audit, state validation, sensors, stop, and continuation behavior | FR-LIF-001, FR-LIF-002, FR-LIF-003, FR-LIF-004, FR-LIF-005, FR-LIF-006 | `tests/fixtures/pi-0.83-extension-events.json`; `tests/unit/t-pi-lifecycle-gate-adapter.test.ts`; `tests/integration/t-pi-lifecycle-gate-adapter.integration.test.ts` |
| M3 | Human gates and continuation control use numbered questions, interactive-only presence, approvals, and agent-settled continuation | FR-GAT-001, FR-GAT-002, FR-GAT-003, FR-GAT-004, FR-LIF-003, FR-LIF-004, FR-LIF-005 | `tests/unit/t-pi-lifecycle-gate-adapter.test.ts`; `tests/integration/t-pi-lifecycle-gate-adapter.integration.test.ts`; `tests/manual/pi-tui-dogfood.md` |
| M4 | Every delegated path, including support/reviewer work and Construction swarm work, uses the Pi native RPC child driver | FR-SUB-001, FR-SUB-002, FR-SUB-003, FR-SUB-004, FR-SUB-005 | `tests/unit/t-pi-driver-contract.test.ts`; `tests/integration/t-pi-child-driver.integration.test.ts`; `scripts/pi-live-rpc.ts` |
| M5 | Pi-specific doctor diagnoses runtime, trust, catalog, installer receipt, and native/internal resources without leaking secrets | FR-DOC-001, FR-DOC-002, FR-DOC-003 | `tests/unit/t-pi-doctor-diagnostics.test.ts`; `tests/integration/t-pi-doctor-dispatch.integration.test.ts` |
| M6 | Setup CLI installs and transactionally upgrades the complete Pi distribution through `--harness pi` | FR-DST-001 | `tests/integration/setup-install-flow.test.ts`; `tests/unit/setup-transaction-coordinator.test.ts`; `tests/e2e/setup-upgrade.test.ts` |
| M7 | Pi Package local and Git activation is derived from the manifest and bound to an immutable, credential-free source identity | FR-DST-002, FR-DST-003 | `tests/unit/t-pi-package-candidate.test.ts`; `tests/integration/t-plugin-projection-packaging.test.ts` |
| M8 | `dist/pi` and its catalog are generated deterministically with source/hash/loader parity and no hand-edited generated surface | FR-DST-004, FR-DST-005, NFR-REL-001 | `tests/smoke/t-pi-dist-structure.test.ts`; `tests/unit/t-pi-harness-manifest.test.ts`; `bun scripts/package.ts pi --check` |
| M9 | Formal validation consists of a real TUI human-gate dogfood and an explicit opt-in live provider RPC journey | FR-VAL-001, FR-VAL-002 | `tests/manual/pi-tui-dogfood.md`; `scripts/pi-live-rpc.ts`; `tests/integration/t-pi-conformance-evidence.integration.test.ts`; `tests/e2e/t-pi-candidate-conformance.serial.test.ts` |
| M10 | User and maintainer documentation covers install, trust, start/resume, update, removal, diagnostics, and maintenance contracts in both languages | FR-VAL-003, FR-VAL-004 | `tests/integration/t-pi-docs-contract.test.ts`; `docs/guide/harnesses/pi.md`; `docs/guide/harnesses/pi.ja.md`; `docs/harness-engineering/09-porting-to-a-new-harness.md`; `docs/harness-engineering/09-porting-to-a-new-harness.ja.md` |

## Formal platform closure

- One accepted `darwin` run and one accepted `linux` run are mandatory.
- Both runs record Pi `>= 0.83.0`, a non-credential provider identifier, the
  full verification commit, M1-M10 assertions, RPC evidence, and TUI evidence.
- RPC automation must record `HUMAN_TURN=0` and `GATE_APPROVED=0`.
- TUI dogfood must record at least one real `HUMAN_TURN` and one corresponding
  `GATE_APPROVED`; generated or RPC input cannot supply them.
- Native Windows is closed by a negative doctor result: `platform=win32`,
  `doctorCheckId=pi.os`, `rejected=true`. It is not a formal-success platform.
