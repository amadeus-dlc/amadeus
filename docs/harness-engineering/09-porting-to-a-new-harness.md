# Porting AI-DLC to a New Harness

> Languages: **English** | [日本語](09-porting-to-a-new-harness.ja.md)

AI-DLC ships from **one core, many harnesses** — today Claude Code, Kiro CLI, Kiro IDE,
and Codex CLI, and the set is open. The hand-authored source is a
harness-neutral `packages/framework/core/` plus a thin `packages/framework/harness/<name>/` surface per CLI; the
packager (`scripts/package.ts`) regenerates each ignored local `dist/<harness>/`
tree; release CI builds the public asset from a clean checkout. Adding another harness is **one directory and one manifest row** — the
engine, methodology, and harness-dir/rules resolution take no `packages/framework/core/` edits at
all; the lone optional exception is a per-harness `--doctor` arm (see Step 2).
This page walks the contract.

> Three senses of "harness" in this repo: **`packages/framework/harness/`** (the
> per-CLI distribution surfaces this page is about), **`docs/harness-engineering/`**
> (this guide), and **`tests/harness/`** (the test-suite helper library).
> Unrelated; only the first is a distribution.

## The shape

```
packages/framework/core/   # harness-neutral source — not edited to add a harness (save the optional --doctor arm)
packages/framework/harness/
  claude/  manifest.ts · skills/amadeus/ · CLAUDE.md · settings.json
  kiro/    manifest.ts · skills/amadeus/ · agents/*.json · hooks/amadeus-kiro-adapter.ts · settings/cli.json · AGENTS.md
  codex/   manifest.ts · emit.ts · skills/amadeus/ · hooks/amadeus-codex-adapter.ts
scripts/
  package.ts               # bun scripts/package.ts [<name>]
  manifest-types.ts        # the HarnessManifest contract every manifest implements
dist/<name>/               # GENERATED, ignored local output
```

`packages/framework/core/` prose names the harness directory with the `{{HARNESS_DIR}}` token; the
packager substitutes whatever `harnessDir` the manifest declares (`.claude` /
`.kiro` / `.codex` / your `.foo`). `.ts` is byte-copied untransformed — the
runtime `harnessDir()` seam in `packages/framework/core/tools/amadeus-lib.ts` derives the directory
from the shipped layout at execution time (open-set: it reads the dir name from
the tool's own path, not a hardcoded list), so the same tool sources run in
every tree. The acceptance gate is **reproducibility**: CI regenerates every
harness in two isolated workspaces and requires byte-identical results.

The packager **discovers** harnesses by scanning `packages/framework/harness/` for a `manifest.ts`,
so a new dir is built by the default `bun scripts/package.ts` with
no edit to the packager itself — the literal meaning of "one directory and one
manifest row, zero shared-code edits."

## Step 1 — the manifest (the declarative 80%)

Create `packages/framework/harness/<name>/manifest.ts` exporting a `HarnessManifest`
(`scripts/manifest-types.ts`). The fields:

- `name` / `harnessDir` — the dir the token substitutes to (e.g. `.foo`).
- `coreDirs: DirMap[]` — which `packages/framework/core/<src>` dirs project into `<harnessDir>/<dst>`.
  Rename or drop dirs here (Kiro `rules → steering`; Codex `rules → amadeus-rules`
  and drops `skills/` — see emit). The 4 session skills are core dirs for
  in-tree harnesses (claude, kiro); codex emits them instead.
- `harnessFiles: FileMap[]` — authored surfaces copied verbatim from
  `packages/framework/harness/<name>/<src>` into the dist (`.md` get token substitution).
  `projectRoot: true` lands a file beside the harness dir (e.g. `AGENTS.md`).
- `frontmatterAdditions` (optional) - per-file YAML lines appended to a
  core-projected `.md`'s frontmatter during projection, for a harness-NATIVE
  field that must not ship to other harnesses (kiro-ide injects
  `tools: ["read", "write", "shell"]` into its delegation-target agent files -
  the IDE reads subagent tool grants from the `.md` frontmatter). Declared as
  manifest data so core stays single-source; the packager errors on a typo'd
  path, a missing frontmatter block, or a key core already declares.
- `rulesRename` — the renamed rules dir (`"steering"` | `"amadeus-rules"` | `null`).
  The packager applies it to the copied dir AND to in-prose `<harnessDir>/rules/`
  references AND to the compiled stage-graph rule paths (it sets
  `AMADEUS_RULES_DIR` at compile so `loadRules` finds the renamed dir) AND emits it
  into a generated `tools/data/harness.json` that the runtime `rulesSubdir()`
  seam reads — so a real install resolves the renamed dir with no hardcoded map.
  This is the seam that makes `rulesRename` purely manifest data: set it here and
  every layer (build prose, compiled paths, runtime) follows, with no `packages/framework/core/` edit.
- `authoredExempt: RegExp[]` — files inside core-copied dirs that are authored,
  not generated (skip the orphan scan), e.g. `^hooks/amadeus-<name>-adapter\.ts$`.
- `skipRunnerGen` — set when the harness ships no `<harnessDir>/skills/` (Codex
  emits its skill tree to `.agents/skills/` via `emit`); the packager then skips
  the standard runner-gen step.
- `emit` — the optional plugin (Step 3), `null` for harnesses that need none.

Claude's manifest is the minimal reference (no rename, no emit); Kiro's adds a
rename + `harnessFiles` (agent JSONs, adapter, the project-root AGENTS.md).

## Step 2 — the hook adapter (the per-harness shim)

Core hooks consume Claude-shaped stdin as the normal form. A new harness ships
**one authored adapter** (`packages/framework/harness/<name>/hooks/amadeus-<name>-adapter.ts`,
listed in `harnessFiles` + `authoredExempt`) that normalizes the harness's hook
payloads into that contract and subprocess-pipes to the shared core hook.
Never split a core hook into logic+adapter — the core bodies stay byte-shared
across all harnesses (the core byte-identity tests verify that every projected
`.ts` matches its `packages/framework/core/` source).

Wire the adapter to the harness's events the harness's own way: Kiro registers
targets in `agents/amadeus.json`; Codex emits `hooks.json`. Register only events
with a real core-hook consumer.

> **The one sanctioned `packages/framework/core/` edit: the doctor arm.** `/amadeus --doctor`
> (`packages/framework/core/tools/amadeus-utility.ts`) health-checks an installed tree, and a new
> harness adds a per-harness arm there for its own install surfaces (adapter +
> wiring files present, any binary-version floor). This is deliberate
> per-harness *logic*, not data — a version check spawns the CLI and compares
> semver, which no manifest row can express (the three-concerns rule: knowledge
> lives in code) — so it is the blessed exception to "zero `packages/framework/core/` edits", not a
> violation (a deliberate design tradeoff). It degrades gracefully: a harness with no arm simply
> gets the generic checks rather than failing. Everything else — dir resolution,
> the rules-dir rename, packaging — stays pure manifest data.

## Step 3 — `emit.ts` (the imperative 20%, only if needed)

Structural divergence a declarative row can't express is `emit.ts` — a plugin
the manifest references that the packager calls with an `EmitContext`
(`coreRoot`, `harnessRoot`, `distRoot`, `harnessDir`, `substituteToken`,
`check`) and that returns the paths it wrote. `check` is retained in the API for
compatibility; the source-only packager invokes emitters in write mode and CI
compares isolated output trees. Codex's is the worked example:
`config.toml`, `hooks.json`, the hook-trust pre-seed, the `AGENTS.md` merge, the
agent-TOML transpositions, and the `.agents/skills/` tree (composed from
`packages/framework/core/tools/amadeus-runner-gen.ts`'s exported render functions under
`AMADEUS_HARNESS_DIR`, never reimplemented). Harnesses whose surfaces are all
authored files (Claude, Kiro) set `emit: null`.

Emit-owned files outside `<harnessDir>` (for example `.agents/skills/` and root
`AGENTS.md`) are included in the isolated-build comparison and source-only
boundary checks.

## Step 4 — the one transform class

The only permitted text transform is the slash-anchored harness-dir family:
`{{HARNESS_DIR}}` → the harness dir in `.md` prose, plus the rules-dir rename.
No blind `sed`. Truthful harness-specific literals in `packages/framework/core/` (the
`$CLAUDE_PROJECT_DIR` note, the harness-dir enumeration in workspace-detection)
carry no token and pass through unchanged — the core-hygiene test
(`t146-core-hygiene`) guards against a new raw path literal slipping in.

## Step 5 — tests + the gate

- The reproducible-build CI job packages every discovered manifest in two
  isolated workspaces and compares the complete outputs byte-for-byte.
- `bun run source-only:check` rejects generated harness output that becomes
  tracked or staged outside the bootstrap/configuration allowlist.
- A `<name>` hook-adapter contract test pipes live-captured payloads through the
  adapter and asserts the observable core-hook effect.
- Live journeys ship as e2e gated on a `skipReason()` (a `AMADEUS_<NAME>_*_LIVE=1`
  env + the binary present + authenticated) so they skip cleanly in the
  deterministic tier and run green locally before a port merges.

Run `bun scripts/package.ts <name>` to regenerate, `bun run source-only:check`
to verify the Git boundary, and the deterministic suite
(`bash tests/run-tests.sh --smoke --unit --integration -P 8`) plus the live
journey to gate. CI performs the isolated-build reproducibility comparison.

## Next

That closes the arc: you have shaped the data surfaces (chapters 01–08) and now
rendered the core onto a new CLI. From here:

- Back to [the Harness Engineer Guide overview](00-overview.md) for the full map.
- The new harness gets a **user-facing chapter** alongside the others — see how
  the existing ones read in the User Guide's
  [Running on other harnesses](../guide/harnesses/README.md) family.
- The normative build contract (manifest types, the `emit` plugin API, the
  `harnessDir()` seam) lives in the Developer Reference's
  [Architecture § Source vs distribution](../reference/01-architecture.md#source-vs-distribution-one-core-many-harnesses).
