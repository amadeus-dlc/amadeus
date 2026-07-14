# Upstream AI-DLC v2.2.0 and Amadeus `main` workspace differences

> Languages: **English** | [日本語](upstream-ai-dlc-v2.2.0-amadeus-main-workspace-differences.ja.md)

This document compares the workspace paths and filenames in
`awslabs/aidlc-workflows` v2.2.0 with those in the Amadeus repository's `main`
HEAD. It also covers the source and installation paths that determine the
generated workspace.

## Compared revisions

| Repository | Revision | Commit | Commit date |
| --- | --- | --- | --- |
| [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows) | [`v2.2.0`](https://github.com/awslabs/aidlc-workflows/tree/v2.2.0) | [`eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4`](https://github.com/awslabs/aidlc-workflows/commit/eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4) | 2026-07-04T14:33:32+10:00 |
| [`amadeus-dlc/amadeus`](https://github.com/amadeus-dlc/amadeus) | `main` HEAD used by this document | [`279e027eb71d7aa0a681a44fa14a0d5ee78f0082`](https://github.com/amadeus-dlc/amadeus/commit/279e027eb71d7aa0a681a44fa14a0d5ee78f0082) | 2026-07-13T23:58:16Z |

The revisions belong to different repositories, so there is no single GitHub
compare view between them. All links below pin the file to one of these exact
revisions.

## Conclusion

Amadeus keeps the v2 space-and-intent persistence model but changes its product
namespace from `aidlc` to `amadeus`. The canonical generated workspace root is:

- upstream v2.2.0: `aidlc/`
- Amadeus `main`: `amadeus/`

This namespace change reaches state files, machine-local files, engine files,
commands, and distribution paths. It does not rename every lifecycle artifact:
the record directory format, phase and stage directories, and most artifact
filenames remain the same relative to the workspace root.

The flat `*-docs/` names still present in some source files are legacy-migration
compatibility references. They are not the canonical workspace root for either
revision compared here.

## Canonical workspace trees

The upstream tree is documented in its
[spaces and intents guide](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/03-spaces-and-intents.md).
The Amadeus tree is documented in the corresponding
[Amadeus guide](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/docs/guide/03-spaces-and-intents.md)
and enforced by its
[path resolver](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/packages/framework/core/tools/amadeus-lib.ts).

```text
# awslabs/aidlc-workflows v2.2.0
<project>/
├── .claude/ | .kiro/ | .codex/
├── aidlc/
│   ├── active-space
│   ├── .aidlc-clone-id
│   └── spaces/<space>/
│       ├── memory/
│       ├── knowledge/
│       ├── codekb/<repo>/
│       └── intents/
│           ├── active-intent
│           ├── intents.json
│           └── <YYMMDD>-<label>/
│               ├── aidlc-state.md
│               ├── audit/<host>-<clone>.md
│               └── <phase>/<stage>/
└── <application code>
```

```text
# amadeus-dlc/amadeus main
<project>/
├── .claude/ | .kiro/ | .codex/
├── amadeus/
│   ├── active-space
│   ├── .amadeus-clone-id
│   └── spaces/<space>/
│       ├── memory/
│       ├── knowledge/
│       ├── codekb/<repo>/
│       │   └── re-scans/<intent-record>.md
│       └── intents/
│           ├── active-intent
│           ├── intents.json
│           └── <YYMMDD>-<label>/
│               ├── amadeus-state.md
│               ├── audit/<host>-<clone>.md
│               └── <phase>/<stage>/
└── <application code>
```

## Workspace path and filename mapping

`<record>` means
`<workspace-root>/spaces/<space>/intents/<YYMMDD>-<label>` below.

| Concern | Upstream v2.2.0 | Amadeus `main` | Difference |
| --- | --- | --- | --- |
| Workspace root | `aidlc/` | `amadeus/` | Product namespace renamed |
| Migration marker | `aidlc/.migrated` | `amadeus/.migrated` | Root renamed; marker retained |
| Active space cursor | `aidlc/active-space` | `amadeus/active-space` | Root renamed; filename retained |
| Space root | `aidlc/spaces/<space>/` | `amadeus/spaces/<space>/` | Root renamed; model retained |
| Method and rules | `aidlc/spaces/<space>/memory/` | `amadeus/spaces/<space>/memory/` | Root renamed; layer layout retained |
| Team knowledge | `aidlc/spaces/<space>/knowledge/` | `amadeus/spaces/<space>/knowledge/` | Root renamed |
| Shared team knowledge | `knowledge/aidlc-shared/` | `knowledge/amadeus-shared/` | Shared directory renamed |
| Per-agent team knowledge | `knowledge/aidlc-<role>-agent/` | `knowledge/amadeus-<role>-agent/` | Agent prefix renamed |
| Code knowledge | `aidlc/spaces/<space>/codekb/<repo>/` | `amadeus/spaces/<space>/codekb/<repo>/` | Root renamed |
| Reverse-engineering scan history | No per-intent `re-scans/` path in v2.2.0 | `codekb/<repo>/re-scans/<intent-record>.md` | Added by Amadeus |
| Intent collection | `aidlc/spaces/<space>/intents/` | `amadeus/spaces/<space>/intents/` | Root renamed |
| Active intent cursor | `intents/active-intent` | `intents/active-intent` | Retained relative to the renamed root |
| Intent registry | `intents/intents.json` | `intents/intents.json` | Retained relative to the renamed root |
| Intent record | `intents/<YYMMDD>-<label>/` | `intents/<YYMMDD>-<label>/` | Format retained |
| Workflow state | `<record>/aidlc-state.md` | `<record>/amadeus-state.md` | Filename prefix renamed |
| Audit trail | `<record>/audit/<host>-<clone>.md` | `<record>/audit/<host>-<clone>.md` | Retained |
| Recovery breadcrumb | `<record>/.aidlc-recovery.md` | `<record>/.amadeus-recovery.md` | Filename prefix renamed |
| Runtime projection | `<record>/runtime-graph.json` | `<record>/runtime-graph.json` | Retained |
| Sensor scratch | `<record>/.aidlc-sensors/` | `<record>/.amadeus-sensors/` | Directory prefix renamed |
| Hook health scratch | `<record>/.aidlc-hooks-health/` | `<record>/.amadeus-hooks-health/` | Directory prefix renamed |
| Clone identifier | `aidlc/.aidlc-clone-id` | `amadeus/.amadeus-clone-id` | Root and filename prefix renamed |
| Session mapping | `aidlc/.aidlc-sessions/` | `amadeus/.amadeus-sessions/` | Root and directory prefix renamed |
| Construction worktrees | `.aidlc/worktrees/` | `.amadeus/worktrees/` | Machine-local namespace renamed |

The current commit policy is unchanged in principle. State, audit shards,
artifacts, method files, and team knowledge are committed. User cursors,
runtime projections, recovery files, sensor output, clone identifiers, and
session mappings are gitignored.

## Lifecycle artifact paths mostly remain stable

The pinned upstream
[artifact reference](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/14-artifacts-reference.md)
and the
[Amadeus artifact reference](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/docs/guide/14-artifacts-reference.md)
have the same lifecycle tree after substituting the product namespace. Examples
include:

| Artifact | Upstream v2.2.0 | Amadeus `main` |
| --- | --- | --- |
| Requirements | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/inception/requirements-analysis/requirements.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/inception/requirements-analysis/requirements.md` |
| Units | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/inception/units-generation/unit-of-work.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/inception/units-generation/unit-of-work.md` |
| Code generation plan | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/construction/<unit>/code-generation/code-generation-plan.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/construction/<unit>/code-generation/code-generation-plan.md` |
| Observability dashboard | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/operation/observability-setup/dashboards.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/operation/observability-setup/dashboards.md` |
| Phase check | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/verification/phase-check-<phase>.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/verification/phase-check-<phase>.md` |
| Stage diary | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/<phase>/<stage>/memory.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/<phase>/<stage>/memory.md` |

Therefore, consumers should replace the workspace and product-derived prefixes,
not assume that every artifact filename changed.

## Framework source and installation paths

The repository source layout changed in addition to the installed workspace.

| Area | Upstream v2.2.0 | Amadeus `main` |
| --- | --- | --- |
| Framework source of truth | `core/` | `packages/framework/core/` |
| Harness source of truth | `harness/<harness>/` | `packages/framework/harness/<harness>/` |
| Root compatibility aliases | Not applicable | `core` and `harness` point to the package-owned source |
| Shared engine directory | `core/aidlc-common/` | `packages/framework/core/amadeus-common/` |
| Agent definitions | `core/agents/aidlc-<role>-agent.md` | `packages/framework/core/agents/amadeus-<role>-agent.md` |
| Tools, hooks, sensors, and skills | `aidlc-*` names | `amadeus-*` names |
| Generated workspace shell | `dist/<harness>/aidlc/` | `dist/<harness>/amadeus/` |
| Primary invocation | `/aidlc`; Codex `$aidlc` | `/amadeus`; Codex `$amadeus` |
| Installation | Copy the selected `dist/<harness>/` files | `bunx` or `npx @amadeus-dlc/setup install`; manual `dist/` copy remains a fallback |

For Codex, the harness directories remain `.codex/` and `.agents/`; the sibling
workspace shell changes from `aidlc/` to `amadeus/`. The Amadeus package-owned
source boundary is documented in its
[workspace layout decision](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/docs/reference/18-workspace-layout.md),
and the install contract is documented in the pinned
[Amadeus README](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/README.md).
The corresponding v2.2.0 manual-copy contract is in the pinned
[upstream README](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/README.md).

## Compatibility implications

These are conclusions from the pinned files, not an upstream migration guide.

1. Resolve the canonical root as `aidlc/` for upstream v2.2.0 and `amadeus/`
   for Amadeus; do not resolve a flat `*-docs/` directory as the current root.
2. Rename product-derived files and directories together: state, recovery,
   scratch, clone and session paths, engine components, and commands.
3. Preserve the space, intent, audit-shard, phase, stage, and lifecycle artifact
   structure unless a separately documented Amadeus enhancement applies.
4. Account for Amadeus's `codekb/<repo>/re-scans/<intent-record>.md` when tooling
   manages reverse-engineering freshness.
5. Use `packages/framework/core/` and `packages/framework/harness/` as the
   Amadeus source of truth; root `core` and `harness` exist for compatibility.
