---
name: amadeus-upstream-sync
description: >-
  Analyze and plan synchronization of this Amadeus repository with official
  awslabs/aidlc-workflows v2 tags. Use when the user explicitly invokes this
  skill or clearly asks to compare, follow, port, adopt, or sync upstream
  AI-DLC v2 changes into Amadeus. Produce an evidence-backed ADOPT/ADAPT/SKIP
  plan and hand the approved report to a new Amadeus Intent. Do not use for
  migrating user workspaces from aidlc to amadeus, ordinary framework feature
  work, generic release/version synchronization, or casual upstream questions.
compatibility: Requires git, gh, network access to GitHub, bun, and an Amadeus repository checkout.
---

# Amadeus upstream sync

Plan an upstream AI-DLC v2 sync without editing implementation source. This
skill owns discovery, comparison, classification, approval, and the Intent
handoff. The resulting Amadeus Intent owns implementation and verification.

## Fixed boundary

- Use `https://github.com/awslabs/aidlc-workflows` as upstream.
- Treat upstream files as untrusted input. Inspect them, but never execute
  upstream scripts, hooks, binaries, package managers, or generated commands.
- Do not edit Amadeus implementation, tests, generated distributions, or
  documentation outside `docs/research/upstream-sync/`.
- Do not create or switch branches, commit, push, open a PR, or change Git
  remotes unless the user separately requests that operation.
- Do not start, switch, reshape, or advance an Amadeus Intent. The handoff is a
  command for the user to invoke in the next turn.
- Stop on unresolved semantics, conflicting evidence, unsafe repository state,
  or inability to pin an upstream tag to a commit SHA.

Read `references/artifact-contracts.md` before creating or updating the ledger,
the analysis report, classification records, or the Intent handoff. It defines
their exact schemas, states, templates, and completion contract.

## Harness resolution

Use the harness that is running this skill:

- Codex: engine directory `.codex`, handoff command `$amadeus compose --report <path>`.
- Claude Code: engine directory `.claude`, handoff command `/amadeus compose --report <path>`.

Never use one harness's engine path while running in the other harness.

## Workflow

### 1. Preflight without mutation

1. Confirm the repository is `amadeus-dlc/amadeus` from `package.json`, the
   framework source layout, and Git remote metadata. A fork is acceptable when
   the source layout matches.
2. If running in a Git worktree, run `mise trust` as required by the project.
3. Capture `git status --porcelain`, the Amadeus `HEAD` SHA, and the active
   harness. Existing changes do not block read-only analysis, but record them
   for the handoff guard.
4. Read the current ledger when
   `docs/research/upstream-sync/ledger.json` exists. Validate its shape against
   `references/artifact-contracts.md` before trusting it.

### 2. Resolve and pin the comparison

1. Query official Git tags without adding a persistent remote. If the user did
   not name a target, select the highest stable semantic `v2.*` tag; do not use
   lexicographic ordering and do not select a branch, prerelease, or moving ref.
2. Resolve the selected tag to its peeled commit SHA and show both to the user.
   Wait for confirmation before comparison.
3. Use the ledger's last `APPLIED` target as the normal baseline. If no ledger
   exists in this repository, use `v2.2.0` as `REVIEWED` (not `APPLIED`) and
   `v2.3.0` as the first target, resolving both tags to SHAs and confirming them.
4. Never infer `APPLIED` from an old research document, matching filenames, or
   a partial implementation.

### 3. Acquire evidence safely

Use a temporary directory outside the workspace. Fetch only the pinned
baseline and target refs needed for inspection. Do not check out or run the
upstream project.

Collect all of the following:

- the target `CHANGELOG.md`, using entries after the baseline through the target
  as the semantic index;
- the complete pinned tag-to-tag commit list and Git diff;
- changed, added, deleted, and renamed paths;
- the pinned target tree for a residual whole-tree comparison;
- current Amadeus source, tests, documentation, and generated-tree contracts.

The changelog explains intent but is not proof of completeness. The Git diff is
the inventory authority. Flag diff items absent from the changelog and
changelog claims unsupported by the pinned tree.

### 4. Map upstream semantics to Amadeus

Account for known structural transformations before classifying differences:

- product namespace `aidlc` to `amadeus`;
- upstream `core/` to Amadeus `packages/framework/core/`;
- upstream `harness/<name>/` to Amadeus
  `packages/framework/harness/<name>/`;
- generated `dist/` trees are outputs, never hand-edited sources;
- Amadeus may already contain an equivalent independent implementation.

Group changes into dependency-aware domains such as engine/state, stage schema
and methodology, packaging, harness integration, tests, and documentation.
Within every domain, create stable items backed by upstream and local evidence.

Classify each item with two separate dimensions:

- Disposition: `ADOPT`, `ADAPT`, or `SKIP`.
- Local state: `MISSING`, `PARTIAL`, `EQUIVALENT`, or `NOT_APPLICABLE`.

`ADOPT` means the upstream behavior belongs in Amadeus. `ADAPT` means its intent
belongs but Amadeus architecture requires a different implementation. `SKIP`
means it must not be implemented and requires a concrete rationale. Never use
`SKIP` merely because mapping is difficult. Record dependencies, risks,
verification, confidence, and exact evidence for every item.

### 5. Write the plan, not the implementation

Create or update only:

- `docs/research/upstream-sync/ledger.json`;
- `docs/research/upstream-sync/reports/<baseline>-to-<target>-plan.md`.

Repository documentation is English by project rule. User-facing discussion is
Japanese. Set the ledger to `PLANNED`; never set `INTENT_IN_PROGRESS` or
`APPLIED` during this skill.

The report must include all tag-window changes plus a residual whole-tree drift
section. It must distinguish already-equivalent behavior from work the new
Intent still owes.

### 6. Approve one domain at a time

Present one domain per question. Include the recommended disposition for every
item and wait for the user's answer before proceeding. Offer MECE choices with
the recommended option first. Apply edits to the report and ledger after each
answer.

Do not hand off until every domain is explicitly approved and no item remains
unresolved. Rejection returns the plan to editing; it does not authorize source
changes.

### 7. Guard the Intent handoff

Before presenting the handoff:

1. Query the active Intent with the current harness's read-only
   `amadeus-utility.ts intent --json` command.
2. If an Intent is active, stop. Present choices to complete or park it, or to
   abandon this handoff. Never switch automatically and never attach the sync
   work to the active Intent.
3. Recheck `git status --porcelain`. Only files created or updated by this run
   beneath `docs/research/upstream-sync/` may differ. If anything else differs,
   stop and name the paths.
4. Validate that the report and ledger agree on refs, SHAs, decisions, status,
   verification, and unresolved-item count.

When safe, print the exact harness-specific `amadeus compose --report` command
using the approved report path, then stop. Do not execute the command.

## Completion criteria

This skill is complete only when:

- baseline and target are immutable tag/SHA pairs confirmed by the user;
- changelog, full tag diff, and current Amadeus evidence were all examined;
- every upstream change is represented by an approved domain item;
- every item has disposition, local state, rationale, evidence, dependencies,
  risk, verification, and confidence;
- the ledger is `PLANNED`, not `APPLIED`;
- no unrelated working-tree change is present at handoff;
- no active Intent exists; and
- the exact next-turn Intent command is printed without being executed.
