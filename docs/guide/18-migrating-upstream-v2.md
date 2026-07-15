# Migrating an Upstream AI-DLC v2 Workspace

> Languages: **English** | [日本語](18-migrating-upstream-v2.ja.md)

Amadeus can convert an upstream v2 `aidlc/` workspace into the equivalent
`amadeus/` workspace without starting or advancing an Intent. Migration is a
workspace utility: it previews every operation, waits for an explicit human
approval, applies the previewed plan, and then validates the result.

The verified compatibility range is upstream v2.2.0 through the commit that
reports version 2.2.10,
[`242953ec76f307c8caf565805f9955a7ef458a92`](https://github.com/awslabs/aidlc-workflows/commit/242953ec76f307c8caf565805f9955a7ef458a92).
There is no upstream `v2.2.10` tag; this guide deliberately identifies the
revision by commit. Every migrated state file must use **State Version 7**.

## Before you migrate

1. Install the Amadeus engine for your harness without running a workflow.
2. Commit the engine installation and ensure `git status --short` is empty.
3. Keep the upstream workspace at `aidlc/`, or choose another path inside the
   same Git repository and filesystem.
4. Finish or remove upstream compose, Bolt, swarm, and registered worktree
   activity. The migrator refuses an active operation rather than guessing how
   to resume it.

A normal Amadeus installation may already contain an untouched workspace seed.
The migrator accepts only a schema-1 installer manifest whose listed file
hashes still match and whose workspace contains no extra data. It preserves the
manifest bytes and replaces the remaining seed data with the migrated
workspace. It refuses an existing workspace that contains user data or differs
from its manifest.

## Run the migration

Use the same orchestrator prefix as other commands:

```text
/amadeus --migrate [path]
```

On Codex CLI, use `$amadeus --migrate [path]`. Omit `path` to read from
`<project>/aidlc`; a path supplied to `--migrate` is the only supported way to
select a different source. Natural-language routing is deliberately
conservative: the request must name `aidlc` or AI-DLC and also use a
migrate/convert term. A matching request such as “migrate the AI-DLC workspace”
uses the default source and never infers a path from prose.

The command always follows this sequence:

1. Run a non-mutating dry-run and print the complete checks, warnings, and
   sorted operation list.
2. Stop at the numbered `Yes` / `No` approval gate.
3. Run the internal apply command only after an explicit `Yes`.
4. Validate every migrated record, confirm audit preservation, run the Amadeus
   doctor, and stage only the migration paths. It does not create a commit.

Do not pass `--apply` to `/amadeus`; apply is intentionally internal to the
approval flow. Migration cannot be combined with workflow options such as
`--stage`, `--phase`, `--scope`, `--depth`, or `--single`.

### Internal and machine-readable interfaces

The conductor uses these deterministic interfaces internally. Both default to
dry-run when `--apply` is absent:

```text
bun <harness>/tools/amadeus-utility.ts migrate [path] [--apply] [--json]
bun <harness>/tools/amadeus-migrate.ts --from <path> [--apply] [--json] [--project-dir <root>]
```

Do not invoke their `--apply` mode directly; the public command owns the human
approval gate. `--json` returns `schemaVersion`, `status`, `mode`, source and
destination paths, `sourceVersion`, target classification, checks, sorted
`operations`, warnings, and verification `evidence`. A refusal or failure exits
non-zero.

## What changes

- The workspace root moves from `aidlc/` to `amadeus/`.
- Each `aidlc-state.md` becomes `amadeus-state.md`;
  `knowledge/aidlc-shared`, known role-agent knowledge directories, and
  `.aidlc-clone-id` receive their Amadeus names.
- Spaces, memory, knowledge, code knowledge (`codekb`), Intent records, cursors,
  binary files, and symlinks are retained. Symlinks are preserved as links and
  never followed.
- `intents.json`, `.migrated`, and the installer manifest retain their original
  bytes. Existing audit bytes remain an unchanged prefix; post-migration health
  checks may only append the doctor's known `GUARDRAIL_LOADED` and
  `HEALTH_CHECKED` events, which are reported in the verification evidence.
- Runtime projections and machine-local scratch data are discarded, including
  runtime graphs, sessions, recovery files, hook/sensor scratch, and latches.
  Amadeus rebuilds runtime projections on the next normal invocation.
- Recognized operational path, command, tool, and environment-variable tokens
  are rewritten outside audit files. Methodology prose and bare product names
  are not globally replaced.
- Known upstream runtime patterns in the project `.gitignore` are rewritten;
  unrelated user entries and old engine files outside the workspace are left
  untouched and reported when relevant.

Amadeus also carries the upstream v2.2.9 `optional_produces` contract forward.
`frontend-components` and `shared-infrastructure` are conditional per-unit
artifacts: if their documented condition does not apply, their absence does not
make a migrated Intent incomplete. If present, they still participate in
directive routing, the artifact registry, and Sensors. See
[Stage Definition](../reference/15-stage-definition.md#optional_produces).

## Refusals and recovery

The dry-run refuses a dirty repository, an invalid or escaping source path,
State Version other than 7, malformed registries or cursors, the reserved
`help` slug, active upstream work, rename collisions, a modified destination
seed, and a detected upstream version outside the verified range.

When no upstream engine version file remains, compatible State Version 7 data
may still be migrated after structural validation; the report marks the source
version as unknown and carries the warning into the approval report. v1
`aidlc-docs/`, reverse migration, and merging into an arbitrary existing
Amadeus workspace are not supported.

Apply uses a clean Git baseline and restores the source workspace, destination
seed, `.gitignore`, and Git index if a write or post-check fails. If rollback
itself cannot be verified, stop and use the reported paths plus Git to inspect
the repository before retrying.

For the structural background, see
[Upstream AI-DLC v2.2.0 and Amadeus workspace differences](../research/upstream-ai-dlc-v2.2.0-amadeus-main-workspace-differences.md).
