# Upstream AI-DLC v2.2.0 and `main` workspace comparison

> Languages: **English** | [日本語](awslabs-aidlc-workflows-v2.2.0-main-workspace-comparison.ja.md)

This note compares the `awslabs/aidlc-workflows` repository at the `v2.2.0`
tag with the default branch's `main` HEAD observed on 2026-07-14. It focuses on
repository layout, files installed into a project, and generated workspace
paths and filenames.

## Conclusion: these refs are divergent product lines

`main` is not a later commit on top of `v2.2.0`. The refs diverged at
`b19c81928bdf1b8d13856f462fcf2ede1720b4cb`: `v2.2.0` has 34 commits that are
not in `main`, while the observed `main` HEAD has 9 commits that are not in
`v2.2.0`. The `main` tree also reports rule-set version `1.0.1`, whereas the
other ref is explicitly tagged `v2.2.0`.

The workspace difference is therefore not an in-place directory rename. The
two refs package different implementations and use different persistence
models:

- `v2.2.0` installs an engine and a neutral `aidlc/` workspace. It separates
  teams into spaces and workflow runs into intent record directories.
- The observed `main` installs prompt/rule files and writes one flat
  `aidlc-docs/` artifact tree at the project root.

The `main` README's “2.0 (Preview)” banner does not mean that `main` contains
the `v2.2.0` implementation. The banner explicitly sends readers to the
separate `v2` branch, while the checked-in `aidlc-rules/VERSION` remains
`1.0.1`.

An integration that consumes either layout must identify the product line
before resolving paths. Treating `main` as an upgrade from `v2.2.0` and merely
renaming the workspace root would lose intent, audit, and stage semantics.

## Compared refs

| Ref | Commit | Commit date | Version evidence |
| --- | --- | --- | --- |
| [`v2.2.0`](https://github.com/awslabs/aidlc-workflows/tree/v2.2.0) | [`eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4`](https://github.com/awslabs/aidlc-workflows/commit/eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4) | 2026-07-04T14:33:32+10:00 | Annotated `v2.2.0` tag |
| Observed `main` HEAD | [`d34bb7adfb4c58aa59bbb46494957f6169121b2b`](https://github.com/awslabs/aidlc-workflows/commit/d34bb7adfb4c58aa59bbb46494957f6169121b2b) | 2026-07-07T11:57:00-04:00 | `aidlc-rules/VERSION` contains `1.0.1` |

The exact tree-to-tree comparison is available in the
[pinned GitHub comparison](https://github.com/awslabs/aidlc-workflows/compare/eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4...d34bb7adfb4c58aa59bbb46494957f6169121b2b).
The principal upstream documents used here are the
[`v2.2.0` artifact reference](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/14-artifacts-reference.md),
the [`v2.2.0` spaces and intents guide](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/03-spaces-and-intents.md),
and the [pinned `main` generated-docs reference](https://github.com/awslabs/aidlc-workflows/blob/d34bb7adfb4c58aa59bbb46494957f6169121b2b/docs/GENERATED_DOCS_REFERENCE.md).

## The workspace root and persistence model changed

| Concern | `v2.2.0` | Observed `main` HEAD |
| --- | --- | --- |
| Generated workspace root | `aidlc/` | `aidlc-docs/` |
| Run boundary | One record per intent | One project-level artifact tree |
| Record path | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` | `aidlc-docs/` |
| Team boundary | `aidlc/spaces/<space>/` | No equivalent documented |
| Intent registry | `intents/intents.json` | No equivalent documented |
| Active cursors | `aidlc/active-space` and `intents/active-intent` | No equivalent documented |
| State | `<record>/aidlc-state.md` | `aidlc-docs/aidlc-state.md` |
| Audit | `<record>/audit/<host>-<clone>.md` shards | `aidlc-docs/audit.md` |
| Team method | `aidlc/spaces/<space>/memory/` | Harness rule file plus a rule-details directory |
| Team knowledge | `aidlc/spaces/<space>/knowledge/` | No equivalent documented |
| Code knowledge | `aidlc/spaces/<space>/codekb/<repo>/` | Reverse-engineering files under `aidlc-docs/inception/` |
| Runtime projection | `<record>/runtime-graph.json` | No equivalent documented |
| Stage diary | A `memory.md` beside each executed stage | No equivalent documented |
| Phase names | Initialization, Ideation, Inception, Construction, Operation | Inception, Construction, Operations |
| Application code | Workspace/code-repository root, outside the record | Workspace root, outside `aidlc-docs/` |

The corresponding high-level shapes are:

```text
# v2.2.0
<workspace>/
├── .claude/ | .kiro/ | .codex/       # engine for the selected harness
├── aidlc/
│   ├── active-space
│   └── spaces/<space>/
│       ├── memory/
│       ├── knowledge/
│       ├── codekb/<repo>/
│       └── intents/
│           ├── active-intent
│           ├── intents.json
│           └── <YYMMDD>-<label>/      # one intent record
│               ├── aidlc-state.md
│               ├── audit/
│               └── <phase>/<stage>/
└── <application code>
```

```text
# observed main HEAD
<workspace>/
├── <harness rule file>
├── .aidlc-rule-details/               # path varies for Kiro and Amazon Q
├── aidlc-docs/
│   ├── aidlc-state.md
│   ├── audit.md
│   ├── inception/
│   ├── construction/
│   └── operations/
└── <application code>
```

## Repository and installation paths are also different

The repository source trees are not rename-compatible.

| Area | `v2.2.0` | Observed `main` HEAD |
| --- | --- | --- |
| Hand-authored implementation | `core/` | `aidlc-rules/` |
| Harness adapters | `harness/<harness>/` | Rules are copied into each harness's native instruction path |
| Generated distributions | `dist/<harness>/` | No `dist/` tree |
| Runtime implementation | TypeScript tools and hooks run with Bun | Markdown workflow rules interpreted by the coding agent |
| User-facing reference | `docs/guide/`, `docs/harness-engineering/`, `docs/reference/` | `docs/GENERATED_DOCS_REFERENCE.md` and rule detail files |

For harnesses supported by both refs, the documented project installation paths
change as follows. The source instructions are the [`v2.2.0` README](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/README.md)
and the [pinned `main` README](https://github.com/awslabs/aidlc-workflows/blob/d34bb7adfb4c58aa59bbb46494957f6169121b2b/README.md).

| Harness | `v2.2.0` project files | Observed `main` project files |
| --- | --- | --- |
| Kiro | `.kiro/`, `AGENTS.md`, and sibling `aidlc/` | `.kiro/steering/aws-aidlc-rules/` and `.kiro/aws-aidlc-rule-details/` |
| Claude Code | `.claude/` and sibling `aidlc/` | `CLAUDE.md` or `.claude/CLAUDE.md`, plus `.aidlc-rule-details/` |
| Codex | `.codex/`, `.agents/`, `AGENTS.md`, and sibling `aidlc/` | `AGENTS.md` and `.aidlc-rule-details/` |

The observed `main` also documents Amazon Q, Cursor, Cline, and GitHub Copilot
rule-file placements. Those do not have direct `v2.2.0` distribution
counterparts.

## Artifact path and filename mapping

`<record>` below means
`aidlc/spaces/<space>/intents/<YYMMDD>-<label>` in `v2.2.0`.

| Artifact or concern | `v2.2.0` | Observed `main` HEAD | Change type |
| --- | --- | --- | --- |
| Workflow state | `<record>/aidlc-state.md` | `aidlc-docs/aidlc-state.md` | Same filename, different cardinality and root |
| Audit trail | `<record>/audit/<host>-<clone>.md` | `aidlc-docs/audit.md` | Directory of per-clone shards becomes one file |
| Requirements | `<record>/inception/requirements-analysis/requirements.md` | `aidlc-docs/inception/requirements/requirements.md` | Stage directory renamed |
| Requirements questions | `<record>/inception/requirements-analysis/requirements-analysis-questions.md` | `aidlc-docs/inception/requirements/requirement-verification-questions.md` | Directory and filename renamed |
| User stories | `<record>/inception/user-stories/{stories,personas}.md` | `aidlc-docs/inception/user-stories/{stories,personas}.md` | Root changed; filenames retained |
| Application design | `<record>/inception/application-design/` | `aidlc-docs/inception/application-design/` | Root changed; file set differs |
| Units | `<record>/inception/units-generation/{unit-of-work,unit-of-work-dependency,unit-of-work-story-map}.md` | The same three filenames under `aidlc-docs/inception/application-design/` | Units directory collapsed into application design |
| Construction plans | Co-located in each stage, such as `<record>/construction/<unit>/code-generation/code-generation-plan.md` | Centralized under `aidlc-docs/construction/plans/`, normally with a `{unit-name}-` filename prefix | Directory and naming convention changed |
| Code summary | `<record>/construction/<unit>/code-generation/code-summary.md` | `aidlc-docs/construction/<unit>/code/*.md` | Stage directory renamed and filename left model-dependent |
| Functional design | `<record>/construction/<unit>/functional-design/` | `aidlc-docs/construction/<unit>/functional-design/` | Root changed; several filenames overlap |
| Build and test | `<record>/construction/build-and-test/` | `aidlc-docs/construction/build-and-test/` | Root changed; documented file set differs |
| Operation artifacts | `<record>/operation/<stage>/...` | `aidlc-docs/operations/` is documented as a placeholder | Singular becomes plural; no one-to-one artifact contract |
| Phase checks | `<record>/verification/phase-check-<phase>.md` | No equivalent documented | `v2.2.0` only |
| Per-stage questions | Co-located `{stage-name}-questions.md` | Questions live in named plan/question files | Convention changed |
| Per-stage memory | Co-located `memory.md` | No equivalent documented | `v2.2.0` only |

Some matching filenames have different meanings because their containing model
changed. In particular, `aidlc-state.md` is per intent in `v2.2.0` but
project-global in the observed `main`; it must not be treated as a simple move.

### Reverse Engineering has a `v2.2.0` documentation inconsistency

The `v2.2.0` artifact reference depicts Reverse Engineering files below
`<record>/inception/reverse-engineering/`. The executable stage definition and
its downstream consumers instead resolve the nine files below
`aidlc/spaces/<space>/codekb/<repo>/`. For operational path resolution, the
[stage definition](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/core/aidlc-common/stages/inception/reverse-engineering.md)
is the stronger source because it defines the producer and the consumer path.

The observed `main` consistently writes those nine filenames to
`aidlc-docs/inception/reverse-engineering/`, as shown by its
[Reverse Engineering rule](https://github.com/awslabs/aidlc-workflows/blob/d34bb7adfb4c58aa59bbb46494957f6169121b2b/aidlc-rules/aws-aidlc-rule-details/inception/reverse-engineering.md).

## Compatibility implications

These are integration recommendations derived from the compared files, not an
upstream migration procedure:

1. Detect `aidlc/spaces/` versus `aidlc-docs/` before reading any artifact.
2. Preserve `v2.2.0` intent directories as independent records. Flattening them
   into one `aidlc-docs/` tree creates filename collisions and discards intent
   identity.
3. Read all `audit/*.md` shards for `v2.2.0`; read only `audit.md` for the
   observed `main` layout.
4. Update automation globs for `requirements-analysis/` versus `requirements/`,
   `operation/` versus `operations/`, and co-located versus centralized plan
   files.
5. Do not install both rule sets into the same project without an explicit
   precedence policy. The full engine instructions and the prompt-only rules
   can both activate and produce incompatible workspace trees.

If the intended comparison is “`v2.2.0` versus the latest commit on the `v2`
branch,” that is a different comparison. The default `main` branch examined
here is not the continuation of `v2.2.0`.
