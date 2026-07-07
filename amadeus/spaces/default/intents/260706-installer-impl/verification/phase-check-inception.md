# Phase Check — Inception To Construction

> Intent: `260706-installer-impl`  
> Verification point: Inception -> Construction  
> Inputs: `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `team-practices.md`, delivery planning artifacts

## Verification Summary

Inception artifacts are coherent enough to enter Construction. The installer scope is fixed as `@amadeus-dlc/setup` under `packages/setup/`, with `install` and `upgrade` as the authoritative commands. `init` is rejected for the first release. Existing `core/`, `harness/`, `dist/`, and `scripts/` paths remain in place.

## Requirements To Stories

| Requirement Area | Story Coverage | Status |
|---|---|---|
| npm package and runtime startup | US-001 | Covered |
| install flow and interactive UX | US-002, US-003, US-004 | Covered |
| upgrade, manifest, target states | US-005, US-006 | Covered |
| shared-file backup and file plan | US-007 | Covered |
| stable SemVer tag source and network retry | US-008, US-012 | Covered |
| manual release workflow | US-009 | Covered |
| CI/package validation gates | US-010 | Covered |
| README/setup documentation | US-011, US-013 | Covered |

## Stories To Architecture

| Story Group | Architecture Coverage | Status |
|---|---|---|
| US-001 / package startup | Setup Package Entrypoint, CLI Command Parser, Package Check | Covered |
| US-002..US-004 / install UX and non-interactive safety | Setup Application Service, Interaction Mode Resolver, Reporter, Prompt Adapter | Covered |
| US-005..US-007 / upgrade and backups | Target Detector, Manifest Store, Operation Planner, Backup Writer, File Applier | Covered |
| US-008 / version source | Version Resolver, Tag Source Port, Archive Source Port, GitHub Archive Adapter | Covered |
| US-009..US-010 / release and gates | Release Workflow Contract, Package Check, CI gates | Covered |
| US-011 / docs | Documentation Update Owner | Covered |
| US-012 / network retry | GitHub Archive Adapter | Covered |

## Architecture To Units And Bolts

| Architecture Area | Unit(s) | Bolt(s) | Status |
|---|---|---|---|
| package shell and parser | U1 | B1 | Ready |
| version/source loading | U2 | B1, B2 | Ready |
| target/manifest detection | U3 | B1, B2 | Ready |
| planning and safety policy | U4 | B1, B2 | Ready |
| apply, report, verify | U5 | B1, B2 | Ready |
| test harness | U6 | B3 | Ready |
| CI/package gates | U7 | B4 | Ready |
| release/docs | U8 | B5 | Ready |

## Open Follow-Ups For Construction

- Functional Design must define exact per-harness required file inventory for manifest and verification.
- NFR/CI stages must select concrete OSV/audit/secret scanning tools and allowlist format.
- CI/Deployment pipeline stages must define npm credential storage and GitHub environment protection.
- Construction must preserve the `install` / `upgrade` command contract and keep `init` rejected.

## Verdict

Ready for Construction after Delivery Planning approval. The first Construction Bolt should be a walking skeleton gate that proves the thin installer path before runtime completeness, CI, and release/docs expansion.

