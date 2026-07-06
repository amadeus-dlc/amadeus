# Upstream Feature Diff

This document gives a single-page view of how features compare across three parties: upstream `awslabs/aidlc-workflows` `main` branch, upstream `v2` branch at the baseline commit, and Amadeus. Each row carries a source you can verify. The Japanese translation is [upstream-feature-diff.ja.md](upstream-feature-diff.ja.md).

- Upstream `main`: https://github.com/awslabs/aidlc-workflows/tree/main/
- Upstream `v2` baseline: commit `b67798c37c71855271b70882a33f47890d41f212` (2.2.0 Adaptive Workflows; adopted via Issue #428 / PR #539)
- Amadeus: this repository (`core/skills/amadeus*`, `.agents/amadeus/` engine, `harness/`, validator, installer)

How to read: each axis below has a five-column table — Aspect / Upstream main / Upstream v2 / Amadeus / Source. Cells in the "Upstream main" column show `N/A (v1-style; see summary below)` where the v1 tree has no counterpart. The summary table classifies each axis by the v2-to-Amadeus relation: Match (faithful adaptation), Adapted (renamed or rewired), Own (Amadeus-only), Pending (upstream feature not yet adopted).

## Relationship between upstream main and v2

Upstream `main` is the v1-generation layout: `.claude/` + `.kiro/` (spec-driven Kiro workflows), `aidlc-rules/`, `docs/`, `scripts/` — measured from the live `main` tree. The `v2` branch restructured the project into `core/` (single source: agents, aidlc-common, hooks, knowledge, memory, scopes, sensors, skills, templates, tools), `harness/<claude|codex|kiro|kiro-ide>/` (per-harness diff layers), `dist/` (generated outputs), and `scripts/` (build). Amadeus tracks the `v2` branch only; v1/v2 differences are summarized here and detailed by the upstream links above. Per-axis rows therefore compare v2 and Amadeus in detail, while the main column records whether a v1 counterpart concept exists.

## Summary

| Axis | v2 → Amadeus relation |
|---|---|
| Lifecycle structure | Match (32 stages, same graph) |
| Scope set | Adapted + Own (9 upstream + `pdm`) |
| Engine tools | Adapted (26 tools, renamed `aidlc-*` → `amadeus-*`, declared exceptions) |
| Hooks | Adapted (11 hooks) |
| Sensors | Adapted (4 sensors + Amadeus two-stage linter detection) |
| Audit events | Adapted + Own (70 upstream + `GUARD_EXEMPTED` = 71) |
| Question protocol | Adapted (grilling wiring is the Amadeus adaptation point) |
| Multi-agent operation | Own |
| Validator | Own |
| Installer | Own |
| Harness | Partially adopted (codex Phase 1) + Pending (build/emit) |
| Not yet adopted from upstream | Pending items tracked in #428 / #552 |

## Lifecycle structure

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Phase/stage graph | N/A (v1-style; Kiro spec phases, see summary above) | 32 stages across Initialization/Ideation/Inception/Construction/Operation | Same 32 stages, same phase machine | `.agents/amadeus/tools/data/stage-graph.json`; upstream `core/aidlc-common/stages/`; `docs/amadeus/lifecycle/` |
| Stage protocol | N/A (v1-style) | `stage-protocol.md` (+ recovery, governance) | Faithful copy with declared local additions (PR-gate pointer #534, cid marker format #504) | `parity-map.json` `exceptions[]`; `.agents/amadeus/amadeus-common/protocols/` |
| Workflow entry | v1 `.kiro` workflows | `/aidlc` orchestrator skill | `/amadeus` (full rename #526; v2-compatible semantics) | PR #553; `AMADEUS.md` |

## Scope set

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Scope count | N/A (v1-style) | 9 scopes | 10 scopes (9 adapted + `pdm`) | `ls core/scopes` at b67798c3 = 9; `ls .agents/amadeus/scopes` = 10 |
| Amadeus-only scope | — | — | `pdm` (ideation/requirements-only; no Construction/Operation) | Issue #429; `.agents/amadeus/scopes/amadeus-pdm.md`; parity exception declared |
| Composed scopes | — | Adaptive Workflows composer (2.2.0) | Adopted (`/amadeus compose`, `amadeus-composer-agent`, `recompose`, `validate-grid`) | Issue #428 / PR #539; codekb architecture notes |

## Engine tools

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Tool count | N/A (v1-style; scripts only) | 26 tools (`core/tools/*.ts`) | 26 tools (`.agents/amadeus/tools/*.ts`), renamed `aidlc-*` → `amadeus-*` | measured `ls *.ts | wc -l` both sides at b67798c3 |
| Name/path mapping | — | — | `parity-map.json` `nameMappings` defines the mechanical correspondence | `dev-scripts/data/parity-map.json` |
| Intentional divergences | — | — | Declared per-file in `engineFileExceptions` (paths) + `exceptions[]` (reasons); e.g. #504 cid marker, #534 PR-gate pointer | `dev-scripts/data/parity-map.json`; `npm run parity:check` |

## Hooks

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Hook count | N/A (v1-style) | 11 hooks (`core/hooks`) | 11 hooks (`.agents/amadeus/hooks`) | measured both sides at b67798c3 |
| Health surface | — | drops + doctor | Same, with doctor surfacing fixes (#432) | Issue #432; codekb architecture notes |

## Sensors

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Sensor set | N/A (v1-style) | 4 (linter, required-sections, type-check, upstream-coverage) | Same 4, `amadeus-` prefixed manifests | measured both sides; `.agents/amadeus/sensors/` |
| Linter sensor behavior | — | wraps configured linter | Two-stage detection in isolated workspace (#538) — implementation adaptation | Issue #538; `dev-scripts/evals/linter-sensor/` |

## Audit events

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Event registry | N/A (v1-style) | 70 events | 71 events (70 + `GUARD_EXEMPTED` for docs-only guard exemption #499) | upstream `core/knowledge/aidlc-shared/audit-format.md` header at b67798c3; `.agents/amadeus/knowledge/amadeus-shared/audit-format.md` (71 events) |
| Local registry additions | — | — | Evidence Verification Boundary section (#506) | `.agents/amadeus/knowledge/amadeus-shared/audit-format.md`; `parity-map.json` `exceptions[]` |

## Question protocol

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Question files | v1 `.kiro` prompts | `[Answer]:` tag protocol + question-rendering annex | Same protocol | `amadeus-common/protocols/stage-protocol.md` §3 |
| Interactive presentation | — | harness question rendering | Wired to `amadeus-grilling` (one question at a time, recommended answer) — the declared adaptation point of the 38 stage skills | `AMADEUS.md` (skill adaptation policy); `core/skills/amadeus-grilling/` |

## Multi-agent operation

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Multi-worktree team operation | N/A | N/A (single-session assumption) | Own: leader + engineers over agmsg, peer-consultation protocol, relay approval, fixed role worktrees | `amadeus/spaces/default/memory/team.md` (並行運用ポリシー / 多体連携の運用); Issues #497 #502 #551 |

## Validator

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Runtime structure validator | N/A | N/A | Own: `amadeus-validator` skill (record structure, traceability, codekb reference resolution #501) | `.agents/skills/amadeus-validator/`; Issue #501 |

## Installer

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Distribution | v1 manual copy | packager (`scripts/`, dist-based) | Own installer: `scripts/amadeus-install.ts` copies the 7 engine dirs + `amadeus*` skills into a target workspace | Issue #451; `scripts/amadeus-install.ts` MANIFEST |

## Harness

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Harness layers | `.claude/` only | `harness/{claude,codex,kiro,kiro-ide}` + generated `dist/<harness>` | `.claude/` symlink wiring (claude); `harness/codex/` Phase 1 = contract + provenance, per-skill `agents/openai.yaml` guards adopted into source skills | measured upstream tree; Issue #552; `harness/codex/README.md`, `harness/codex/provenance.md` |
| Codex guard files | N/A | `dist/codex/.agents/skills/aidlc-*/agents/openai.yaml` (38, generated) | 38 adopted into `core/skills/amadeus-*/agents/openai.yaml` (+ promoted copies); identical guard content verified by sha256 | `harness/codex/provenance.md` (mapping table + hash) |

## Not yet adopted from upstream

| Aspect | Upstream main | Upstream v2 | Amadeus | Source |
|---|---|---|---|---|
| Build/emit machinery | N/A | `dist/` generation via `harness/*/emit.ts` + packager scripts | Pending: planned as Phase 2 of the three-layer restructuring (core/harness/dist; design settled, implementation deferred to a follow-up Intent) | Issue #552 design decisions (feasibility Q1–Q6); `harness/codex/README.md` |
| kiro / kiro-ide harnesses | `.kiro` native | `harness/kiro`, `harness/kiro-ide` | Not adopted (no current target) | measured upstream tree at b67798c3 |
| Upstream drift items | — | 8 tracked divergences (all "unfixed upstream; keep faithful copy") | Tracked, not locally patched (parity preserved) | Issue #428 comment thread (drift table, items 1–8); PR #539 |

## Follow-up procedure when the baseline commit changes

1. Update the fresh-clone baseline: run `npm run parity:check` after updating `dev-scripts/data/parity-baseline.json` via `dev-scripts/generate-parity-baseline.ts` (see PR #542 for the provenance-verified regeneration precedent).
2. Re-check declared divergences: each entry in `parity-map.json` `exceptions[]` says "remove when upstream adopts"; verify per item against the new baseline.
3. Re-verify the drift items in Issue #428's comment thread (the next baseline-update Intent inherits them).
4. Update this document: refresh the baseline commit above, then re-measure the per-axis counts (scopes / tools / hooks / sensors / audit events) on both sides; per-mechanism re-intake procedures live with each mechanism (e.g. `harness/codex/provenance.md` for Codex guards).
5. Keep this document consistent with `docs/amadeus/lifecycle/` and the language policy (update `.md` and `.ja.md` together).
