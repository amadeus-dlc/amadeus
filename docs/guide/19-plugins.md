# Plugins

> Languages: **English** | [日本語](19-plugins.ja.md)

**A plugin is a small, hand-authored bundle that adds one or more stages, seam
entries, and prose fragments to a host workspace — without editing the framework
source.** You author it once under `plugins/<name>/`, the packager projects it
into every harness, and the host composition engine merges it into a workspace,
reports on it, and removes it again — all reversibly and without clobbering
anything the workspace already owns.

This chapter is the user-facing reference and the authoring guide. It describes
what the plugin system supports today, what it deliberately defers, the
user-visible safety contract, how to verify a plugin locally, and how the six
packaged harness faces differ from the four self-install faces. It is not a copy
of any upstream README — every path, command, and failure contract below is the
Amadeus one.

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

The `plugin.json` manifest declares three kinds of contribution:

- **`stages`** — new stage files the plugin copies into the host. Each entry has
  a `slug` (unique, must not already exist in the host) and a `path` (the
  host-tree-relative destination, which must not already exist).
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
   the plugin's own subtree), and projects every plugin into the six packaged
   harness trees plus a harness-neutral bundle. With no plugins present, the
   output is byte-identical to a plugin-free build.
3. **Inspect** — the composition engine checks a discovered plugin against a host
   snapshot and collects *every* problem (same-name stage, malformed manifest,
   unknown seam, clobber) before deciding. A single problem yields a rejection and
   no plan is built.
4. **Compose** — a clean plugin is applied as a single three-surface atomic
   transaction: host bytes, the composition record, and the audit entry are
   written together, or not at all.
5. **Doctor** — a read-only diagnostic projects each active plugin's status
   (`composed`, `drift`, or `recovery-pending`) from the current host state.
6. **Drop** — a record-owned removal deletes the plugin's owned files and rebuilds
   each shared file from the base plus the *remaining* plugins' contributions.

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

## Verifying a plugin

Verification is local and temporary — you never mutate the committed tree to try
a plugin out. The reference lifecycle test is the model: it copies the canonical
source into a throwaway temp workspace, redirects the packager's source and output
roots there (`AMADEUS_PLUGINS_ROOT` / `AMADEUS_DIST_ROOT`), projects into all six
faces, composes into a temp host, runs the doctor, and drops — asserting that only
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

## Six packaged faces, four self-install faces

The packager projects every plugin into **six** harness faces: `claude`, `codex`,
`cursor`, `kiro`, `kiro-ide`, and `opencode`. Self-install — the reflection of a
harness into the project root — stays the **closed four**: `claude`, `codex`,
`cursor`, and `opencode`. `kiro` and `kiro-ide` are packaged but never promoted to
the project root. The two matrices are verified against separate expected sets;
one is never used as a stand-in for the other, and the four is never widened to
six.
