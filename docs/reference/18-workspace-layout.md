# Workspace Layout Decision

> Languages: **English** | [日本語](18-workspace-layout.ja.md)

> **Status update (2026-08-03):** The package-owned source boundary decided here remains current. The later source-only distribution decision supersedes this document's original tracked-output boundary: root `dist/` and self-install projections are now ignored local output, and versioned GitHub Release Assets are the public install contract.

## Context

GitHub issue #610 tracks normalizing the workspace/package layout of the Amadeus repository. The previous assumption placed the framework source of truth in root-level `core/` and `harness/`, and only the setup/installer work in a future `packages/setup/`.

That leaves two mixed axes of ownership: the framework source at the root, the setup package under `packages/`. Before `packages/setup` proceeds as a separate intent, the framework side also needs a package-owned source boundary.

## Decision

Amadeus moves the framework's authored source into `packages/framework/`.

- `packages/framework/core/` becomes the harness-neutral source of truth.
- `packages/framework/harness/<name>/` becomes the harness-specific authored source.
- `packages/framework/package.json` is added as the framework package boundary.
- Root `scripts/` stays as repository-level packaging/self-promotion tooling.
- Root `dist/<name>/` is generated as ignored local output and by release CI from a clean checkout.
- Root `.claude/`, `.codex/`, `.agents` remain dogfood self-install targets, with generated content ignored outside the tracked bootstrap/configuration allowlist.
- The repository root carries no `core` or `harness` entries; docs/tests/imports reference `packages/framework/core` and `packages/framework/harness` directly.
- `packages/setup` is treated as a sibling package owned by a separate intent and is not an implementation target of this framework migration.

```text
packages/framework/core/        # framework source of truth
packages/framework/harness/     # harness-specific authored source
packages/framework/package.json # framework package boundary
scripts/                       # repository-level packaging/self-promotion tooling
dist/<name>/                    # ignored local distribution output
.claude/.codex/.agents          # generated dogfood runtime surfaces + tracked allowlist
packages/setup/                 # sibling package, handled by separate intent
```

## Alternatives Considered

### Status quo without explanation

Keep root-level `core/`, `harness/`, `scripts/`, and `dist/` as they are, without explaining the mix with `packages/setup`.

This is the smallest change, but it does not deliver the MECE package-owned boundary that Issue #610 asks for, so it is rejected.

### Full workspace normalization including scripts and dist

Move the whole framework side into `packages/framework/{core,harness,dist,scripts}`.

This is the most consistent package-owned boundary. The source-only migration later moved the public install contract from tracked `dist/` to Release Assets without relocating root `scripts/` or the local output path.

Rejected for path ownership. Only the `core` and `harness` source boundary moved into package ownership; `scripts` and the ignored local `dist` output path remain at the root.

### Source alias only

Do not add `packages/framework/`; keep root `core/` and `harness/` and update only the docs.

This carries the lowest implementation risk, but it falls short of the workspace layout normalization Issue #610 requires, so it is rejected.

## Path Impact

| Area | New contract | Impact |
| --- | --- | --- |
| `scripts/package.ts` | source roots are `packages/framework/core` and `packages/framework/harness`; output is root `dist` | change `CORE_ROOT` / `HARNESS_ROOT` to package-owned paths |
| `scripts/promote-self.ts` | syncs root `.claude/.codex/.agents` from root `dist/claude` and root `dist/codex` | unchanged |
| `scripts/manifest-types.ts` | manifests import the shared contract in root `scripts` from the package-owned harness | update the import path |
| `dist/*` | ignored local output; release CI packages a clean build | stays at the root |
| `.claude/.codex/.agents` | generated repository dogfood runtime plus tracked bootstrap/configuration allowlist | stays at the root |
| `tsconfig.json` | authored TypeScript source includes `packages/framework/core` and `packages/framework/harness` | update the include paths |
| tests/docs | reference `packages/framework/core` / `packages/framework/harness` directly | — |
| `.github/workflows/ci.yml` | builds before tests, compares two isolated builds, and enforces the source-only boundary | root script contract remains preserved |

## Guard Preservation

The current source-only boundary validates generator properties instead of parity with committed copies.

- CI compares two isolated builds byte-for-byte to verify reproducibility.
- `bun run source-only:check` rejects generated output that becomes tracked or staged outside the allowlist.
- Graph compilation verifies successful generation and structural invariants.
- `bun run typecheck`, `bun run lint`, relevant `tests/run-tests.sh` profiles remain the validation path when code or tests change.

Release CI builds the distributions from a clean checkout and publishes one versioned asset with its checksum and manifest. This closes the path from a local `dist/` edit to a release without introducing a replacement hand-edit guard.

## Validation Checklist

When shipping a change that touches this layout, confirm the following according to the kind of change.

| Change type | Required validation |
| --- | --- |
| Source path or manifest import changes | `bun run typecheck` |
| Packaging source/output path changes | `bun run build`, reproducible-build CI, `bun run source-only:check` |
| Self-install, Codex/Claude runtime surface, or composed scope behavior changes | `bun run build`, relevant tests, `bun run source-only:check` |
| Documentation path wording changes | docs review and docs legacy refs gate if relevant |
| Behavior changes touching harness runtime flows | relevant `tests/run-tests.sh` profile |

## Consequences

### Positive

- The framework source is collected under `packages/framework/`, sitting beside `packages/setup` as a sibling package.
- Root `dist/` remains a convenient local output path without entering reviews or commits.
- The root `scripts/` build/release workflow is preserved.

### Negative

- Full relocation of `scripts/` or the local `dist/` output path, if desired later, still requires a dedicated migration intent.

## Future Migration Trigger

Reconsider moving root `scripts/` only if framework packaging becomes independently releasable from the repository root.

Reconsider moving root `dist/` only if the local build path can be changed deliberately across README, docs, tests, CI, self-promotion, release assets, and the installer.
