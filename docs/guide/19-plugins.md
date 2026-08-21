# Plugins

> Languages: **English** | [日本語](19-plugins.ja.md)

**A plugin is a small, hand-authored bundle that adds one or more stages, seam
entries, and prose fragments to a host workspace — without editing the framework
source.** You author it once under `plugins/<name>/`, the packager projects it
into every harness, and the host composition engine merges it into a workspace,
reports on it, and removes it again — all reversibly and without clobbering
anything the workspace already owns.

This chapter is the user-facing reference and the authoring guide. It describes
what the plugin system supports today, its command-line surface, how a plugin is
composed into a host automatically at session start, what the safety contract
guarantees, how to verify a plugin locally, and how the packaged harness
faces differ from the self-install faces. It is not a copy of any upstream
README — every path, command, and failure contract below is the Amadeus one.

The worked example is the reference plugin `test-pro`, kept as authoring source
at `tests/fixtures/plugins/test-pro/` and driven end to end by
`tests/integration/t254-reference-plugin-lifecycle.test.ts`.

---

## The authoring path and namespace

A plugin is a directory `plugins/<name>/` whose name is its identity — unique
across all plugins. It carries a `plugin.json` manifest plus the files the
manifest references. Every file the plugin ships is projected into a reserved
namespace, `plugins/<name>/`, inside each harness tree, so a plugin's output is
structurally disjoint from the core framework's output and from every other
plugin. Cross-plugin collisions are impossible by construction.

Keep the authoring tree natural and relative to the plugin root:

```text
plugins/example/
  plugin.json
  stages/review.md
```

Do not repeat the namespace as `plugins/example/plugins/example/stages/`.

The `plugin.json` manifest declares three kinds of contribution:

- **`stages`** — new stage files the plugin copies into the host. Each entry has
  a `slug` (unique, must not already exist in the host) and a `path` (the
  plugin-root-relative source, for example `stages/review.md`). Composition
  resolves those bytes from the bundle, then independently writes them to the
  host at `plugins/<name>/<path>`; that target must not already exist.
- **`seams`** — additive entries appended to an existing host stage's seam array.
  The four seams are `produces`, `consumes`, `sensors`, and `required_sections`;
  any other name is rejected as an unknown seam. Entries are appended in
  declaration order and de-duplicated against what the host already has.
- **`fragments`** — a block of text spliced into an existing host file at a named
  `anchor`, tagged with an `id` so it can be excised exactly on drop.

Prose files (`.md`) are transformed per harness when projected: the
`{{HARNESS_DIR}}` token becomes that harness's directory (`.claude`, `.kiro`, and
so on), and a harness that renames its rules directory (kiro → `steering`) has
in-prose `rules/` paths rewritten. JSON and TypeScript are copied verbatim.

---

## The lifecycle

1. **Author** — write `plugins/<name>/plugin.json` and its referenced files.
2. **Project** — the packager discovers `plugins/`, validates each source
   structurally (a manifest is present, identities are unique, no path escapes
   the plugin's own subtree), and projects every plugin into each packaged
   harness tree plus a harness-neutral bundle. With no plugins present, the
   output is byte-identical to a plugin-free build.
3. **Inspect** — the composition engine checks a discovered plugin against a host
   snapshot and collects *every* problem (same-name stage, malformed manifest,
   unknown seam, clobber) before deciding. A single problem yields a rejection and
   no plan is built.
4. **Compose** — a clean plugin is applied as a single three-surface atomic
   transaction: host bytes, the composition record, and the audit entry are
   written together, or not at all. The composition record persists the explicit
   trust grant (plugin, content digest, timestamp) and each owned stage digest.
5. **Doctor** — a read-only diagnostic compares project selection, project
   supply, host staging, and the composition record. It distinguishes
   `source-missing`, `not-installed`, `stale`, and `current` states.
6. **Drop** — a record-owned removal deletes the plugin's owned files and rebuilds
   each shared file from the base plus the *remaining* plugins' contributions.

---

## The entry points

Every host-side operation is a verb of the harness-neutral CLI
`amadeus-plugin.ts`. Three surfaces reach that one CLI. They differ in framing,
never in behaviour — the verb contract below is the same through all of them:

- **The engine verb, `/amadeus plugin <verb>`** — the first-choice notation, and
  the same on every harness. Everything after `plugin` reaches the plugin CLI
  unparsed, and its exit code is returned verbatim, so the CLI's own usage errors
  stay authoritative.
- **The skills** — `/amadeus-plugin` is a user-invocable skill that runs the
  read-only verbs first, explains the resolved state, and then runs exactly one
  verb you select by name; it is the guarded way to reach the mutating verbs
  (`install`, `drop`). Separately, once a plugin that contributes a stage is
  composed, that stage gets its own runner skill, `/amadeus-<slug>`.
- **The raw CLI** — for scripting and advanced use, run the copy shipped into
  your harness tree directly:

  ```
  bun .claude/tools/amadeus-plugin.ts <verb> [flags]
  ```

  Other harnesses substitute their own directory (`.codex`, `.cursor`, `.kimi`,
  and so on): `bun <harness-dir>/tools/amadeus-plugin.ts <verb>`.

The verbs are:

| Verb | What it does | Exit |
| --- | --- | --- |
| `compose [--if-stale] [--project-root <dir>]` | Reconcile the current host with the project-level `plugins` selection. `--if-stale` is a no-op only when selection, supply, staging, and composition are current. | `0` on success or no-op; `1` on validation or apply failure |
| `doctor [--project-root <dir>]` | Compare project selection, supply, host staging, and composition, reporting `source-missing`, `not-installed`, `stale`, or `current`. | `0` when healthy; `1` when any plugin is degraded or recovery-pending |
| `drop <plugin-name> [--project-root <dir>]` | Remove one plugin's owned files and rebuild the shared files from the remaining plugins. | `0` on success; `1` on a rejected or failed drop |
| `install <path> [--force] [--project-root <dir>]` | Persist the source at project `plugins/<name>/`, compose it into the current host, then commit its name to `amadeus/config.json`. A failure restores all four surfaces. | `0` on success; `1` on a rejected or failed install |
| `status [--project-root <dir>]` | Print counts: installed, composed, and the audit revision. | `0` |

With no `--project-root`, the host root is the **harness directory the CLI itself
is installed in** — `bun .codex/tools/amadeus-plugin.ts compose` composes into
`.codex/` from anywhere. That is the same root the engine reads composed plugin
stages back from, so install, compose, and discovery cannot drift apart.
`--project-root <dir>` overrides it to target another host — it is how you compose
into a host that is not where the CLI lives (the `kiro`, `kiro-ide`, and `pi`
faces, which are packaged but never self-installed, always need it).

Argument handling is fail-closed and happens **before** any mutation: an unknown
verb, an unknown flag, or a surplus argument prints usage on stderr and exits `2`
without touching the host. There is no `--help` flag; run the CLI with no verb to
see the usage block.

---

## Automatic composition at session start

You do not normally run `compose` by hand. Each harness that exposes a
session-start-equivalent hook wires an auto-compose call that runs
`amadeus-plugin.ts compose --if-stale` when a session begins. Because of the
`--if-stale` fast path, a session whose composition record is already current
pays only a few `existsSync` probes and returns without recomposing, so the hook
adds no startup latency in the common case. Any hook failure is a single stderr
warning and a zero exit — a plugin problem never blocks the session.

All eight packaged faces wire this trigger. Kiro CLI and Kiro IDE share one
`.kiro` host tree, so the eight faces cover seven host directories:

| Face | Session-start trigger | Auto-compose |
| --- | --- | --- |
| `claude` | `SessionStart` | wired |
| `codex` | `SessionStart` | wired |
| `cursor` | `sessionStart` | wired |
| `kimi` | `SessionStart` | wired |
| `kiro` | `agentSpawn` | wired |
| `kiro-ide` | `promptSubmit` (idempotent via `--if-stale`) | wired |
| `opencode` | JavaScript plugin `session.created` event | wired |
| `pi` | extension `session_start` event | wired |

OpenCode uses its official JavaScript/TypeScript plugin event rather than a
shell hook. The existing `.opencode/plugins/amadeus-opencode-plugin.ts` handles
`session.created`, reconciles only `.opencode`, and treats failure as a visible,
non-blocking warning just like the other session-start adapters.

---

## The plugin section of `--doctor`

`/amadeus --doctor` includes a read-only plugin section that is a pure projection
of three existing engine reads (the diagnostics, the composition revision, and the
drops record) — it runs no new scan and makes no new judgment. Each row maps a
state to a pass/fail contribution:

| State | Meaning | Doctor |
| --- | --- | --- |
| `ok` | composed and matching the record (`composed@<rev>`) | visible, passing |
| `drift` | a shared file diverged from the recorded composition | visible, passing |
| `advisory` | a drop-time advisory the record carries | visible, passing |
| `degraded` | a face or drop the record marks as degraded | **loud fail** |
| `recovery-pending` | a crash left a pending recovery (`run compose to recover`) | **loud fail** |
| `unknown` | a status or severity outside the known set (fail-closed) | **loud fail** |

A host with no plugins degrades to a single passing row, `Plugins: 0 installed`,
so the plugin section never flips a healthy `--doctor` exit on a plugin-free
project. Any engine status or drop severity outside the known set is not trusted
or silently dropped — it renders as an `unknown` row that fails the check.

---

## Installing a plugin into a host

The packager emits a per-face **install bundle** for every one of the eight faces,
alongside a top-level `INSTALL.md` whose steps are dispatched on the face's host
class:

- **`native-manifest`** (`claude`) — install through the host plugin marketplace
  using `.claude-plugin/plugin.json`; auto-compose runs from `hooks/hooks.json`.
- **`folder-drop-auto`** (`codex`, `cursor`, `kimi`, `kiro`, `kiro-ide`, `pi`) — copy the
  bundle's `plugins/<name>/` into `<harness-dir>/.amadeus-plugin-src/<name>/` under
  your project root (`.codex/.amadeus-plugin-src/<name>/` for Codex, and so on) —
  the harness-rooted directory `compose` scans, which is also the root the engine
  reads composed plugin stages back from; auto-compose is wired from
  `hooks/auto-compose.snippet`.
- **`native-plugin-auto`** (`opencode`) — the JavaScript plugin receives
  `session.created` and invokes the same current-host reconciliation.

The `install` verb is the transactional one-operation form. It persists supply
under project `plugins/<name>/`, materializes the current harness staging tree,
composes through the shared engine, and writes the sorted project selection
last. `drop` removes the name only after a safe host drop and deliberately keeps
the project supply for later re-selection.

```
/amadeus plugin install path/to/plugins/example
```

The plugin's name is the source folder's basename, and the staged copy lands at
`<host>/.amadeus-plugin-src/<name>/`. Re-running it on identical bytes is
idempotent. A *different* plugin already staged under that name is rejected
rather than overwritten; `--force` replaces it, and dropping it first is the
alternative. Symlinks in the source are skipped with a stderr line each, never
followed. A compose failure is returned unchanged, so the stage that failed stays
visible.

Composition refuses to write into an output directory unless it is empty or is our
own prior projection of the *same* plugin and harness. A pre-existing non-empty
directory, a projection of a *different* plugin or harness, a regular file, a
symlink, or a broken symlink at the target is each rejected with its own reason —
never a raw filesystem stack, and never a clobber.

---

## The safety contract

These guarantees are user-visible and hold for every compose and drop:

- **No clobber.** A plugin never overwrites a file the host already owns. An
  owned-path collision or a duplicate fragment id is rejected before any write.
- **Declared-only mutation.** Only the plugin's declared stages, seams, and
  fragments are created, detected, and removed. Unrelated host bytes, paths
  outside the composition record, and user-authored content are never touched.
- **Failure invariance.** A rejected inspect, a failed self-heal verification, or
  any commit failure leaves host bytes, the composition record, and the audit log
  exactly as they were. A same-name stage, a malformed manifest, or an unknown
  seam fails loudly — never as a silent success or advisory.
- **Atomic recovery.** A mid-operation crash is recovered to pre-state on the next
  operation under the workspace lock; journal or preimage corruption stops loudly
  and blocks new compose/drop until resolved.
- **Record-owned drop.** A drop removes only what the composition record attributes
  to the plugin. If a shared file has drifted from the recorded composition, the
  drop is rejected rather than guessing — your edits are never silently discarded.
- **Filesystem baseline restore.** A drop also prunes the directories the compose
  created for the plugin once they are empty (`plugins/<name>/stages/` and its
  parents), so the host tree returns to its pre-compose structure. A directory
  that still holds anything is left untouched. The engine's dot-state at the
  harness root — including `.amadeus-plugin-drops.json` — is audit data, not host
  surface: it may survive a drop and its presence never denies a restored
  baseline.

---

## Deferred surfaces

The following are intentionally **not** part of the plugin system today. A plugin
manifest that assumes them is out of scope, and this guide does not present them
as supported:

- a marketplace or remote plugin fetch,
- a lockfile or pinned-version resolution,
- composition of `agents`, `scopes`, `memory`, or `knowledge`,
- conditional `when` evaluation on contributions.

A plugin composes stages, the four named seams, and anchored fragments — nothing
more. Treat any of the above as a future capability, not a current one.

---

## Advisories

A plugin manifest may declare *advisories*: named checks the engine evaluates at
stage checkpoints by running the plugin's own evaluator. An advisory is a nudge,
never an action — the engine renders it, the doctor lists it, and you decide what
to do. Only the declaring plugin's evaluator can release the hold it raises, so
nothing runs on your behalf and nothing writes state for you.

No plugin bundled with Amadeus declares an advisory today, so the channel is
dormant on a stock install and you will not see one until you install a plugin
that supplies one. The engine side is unchanged and ready for that plugin.

---

## Verifying a plugin

Verification is local and temporary — you never mutate the committed tree to try
a plugin out. The reference lifecycle test is the model: it copies the canonical
source into a throwaway temp workspace, redirects the packager's source and output
roots there (`AMADEUS_PLUGINS_ROOT` / `AMADEUS_DIST_ROOT`), projects into every
face, composes into a temp host, runs the doctor, and drops — asserting that only
the declared artifacts are created, detected, and removed and that no temporary
file survives in the tracked tree.

To exercise the reference plugin:

```
bun test tests/integration/t254-reference-plugin-lifecycle.test.ts
```

When you author your own plugin, follow the same shape: drive the lifecycle in a
temp workspace, assert the declared-only contract, and confirm `git status` is
clean afterwards.

---

## Declaring every module you import

A composed plugin carries exactly the files its `plugin.json` declares. So a
helper module that your declared tool imports, but that you forgot to list in
`tools`, is not a stylistic omission — it is a missing import in every composed
host. The plugin loads in your working tree, where the file is simply there on
disk, and fails wherever it is actually installed.

The packager closes this with the **import-closure guard**. Starting from each
tool your manifest declares, it walks the transitive closure of *relative*
imports (`./x.ts`, `../y.ts`) and requires every module it reaches to be both
declared in `plugin.json` and present among your plugin's own source files. Bare
specifiers like `node:crypto` are resolved by the runtime from outside the plugin
tree and are out of scope; an absolute specifier is a boundary violation and is
reported as such.

The guard runs as part of the projection, so a build fails rather than shipping
a broken face. It has no allowlist and no skip flag — a module passes by being
declared and owned, or not at all. A reference it cannot read is enumerated as a
failure instead of being dropped from the closure, which is what keeps a typo in
an import path from quietly shrinking the set that gets checked.

Failures print one line per offending reference, prefixed with your plugin's
name, and the whole repair set is listed at once rather than stopping at the
first offender:

```
MISSING from my-plugin plugin.json: plugins/my-plugin/tools/helper.ts
MISSING from my-plugin owned sources: plugins/my-plugin/tools/helper.ts
UNREADABLE import in my-plugin: plugins/my-plugin/tools/typo.ts
```

Read them as three distinct repairs. `MISSING from … plugin.json` means the file
exists in your plugin but the manifest does not carry it — add it to `tools`.
`MISSING from … owned sources` means the manifest names a path with no file
behind it inside the plugin. `UNREADABLE import` means the reference could not be
resolved at all: an absent file, a bad path, or a symlink whose real target
leaves the repository.

The guard lives at `scripts/import-closure-guard.ts`; its internals and test
layout are described in
[Contributing](../reference/11-contributing.md#the-plugin-import-closure-guard).

---

## Eight packaged faces, six self-install faces

The packager projects every plugin into **eight** harness faces: `claude`,
`codex`, `cursor`, `kiro`, `kiro-ide`, `opencode`, `kimi`, and `pi`.
Self-install — the reflection of a harness into the project root — stays the
**closed six**: `claude`, `codex`, `cursor`, `opencode`, `kimi`, and `pi`.
`kiro` and `kiro-ide` are packaged but never promoted to the project root. The two
matrices are verified against separate expected sets; one is never used as a
stand-in for the other, and the six is never widened to the packaged set.
