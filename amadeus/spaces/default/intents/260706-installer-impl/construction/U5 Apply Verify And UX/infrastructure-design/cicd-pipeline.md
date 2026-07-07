# CI/CD Pipeline — U5 Apply Verify And UX

> Stage: construction / infrastructure-design  
> Unit: U5 Apply Verify And UX

## Pipeline Position

U5 contributes blocking PR checks for the installer mutation boundary. It does not publish the npm package and does not own the release button; U8/manual `workflow_dispatch` remains the publication path.

## PR Gate Stages

| Stage | Required checks |
|---|---|
| setup package type/lint | root `bun run typecheck` and `bun run lint` must include generated `packages/setup/**/*.ts` before this gate is considered effective |
| apply integration tests | temp-dir copy/backup/update/force-update fixtures |
| no-write tests | `canApply:false`, declined confirmation, prompt suppression |
| failure classification tests | backup failure, copy failure, manifest-write-failed, verification-failed |
| reporter snapshots | plan, no-write, apply-failed, manifest-write-failed, verification-failed, success |
| parity checks | `bun run dist:check`, `bun run promote:self:check` when source changes affect generated/self-installed trees |
| security checks | package dry-run, dependency audit/OSV, secret scanning for installer-related PRs |
| coverage floor | coverage registry/ratchet freshness for installer apply/report tests |

## Typecheck And Lint Scope

The current root scripts are not sufficient until U7/code-generation updates them:

- `tsconfig.json` must include `packages/setup/src/**/*.ts` and any setup-specific test helpers that are not already covered by `tsconfig.tests.json`;
- `package.json` `lint` must check `packages/setup/` in addition to `tests/`;
- `bun run check` must fail when generated setup package TypeScript fails typecheck or Biome checks.

This design intentionally uses the root scripts rather than a local-only manual command so GitHub Actions, local validation, and release validation exercise the same installer TypeScript files. A `packages/setup` dedicated script may be added for developer convenience, but it cannot replace root CI coverage for the publishable package.

## Call-Order Assertions

CI must assert:

- Reporter renders pre-apply plan before FileApplier mutation.
- `canApply:false` never calls FileApplier or ManifestStore.
- declined confirmation never calls FileApplier or ManifestStore.
- `backup` completes before dependent `update` / `force-update`.
- manifest write starts only after `ApplyResult.ok === true`.
- verification starts only after manifest write succeeds.
- final report is derived from structured outcomes, not re-planning.

## Artifact Handling

CI artifacts may include failing reporter snapshots, fake-port call traces, temp-dir fixture summaries, and manifest JSON fixture diffs. Do not upload real user targets, secrets, or file contents from developer machines.

## Release Interaction

The release workflow should depend on the same U5 tests before package dry-run, SBOM/provenance generation, and npm publish validation. A `main` merge alone must not publish; release remains manually triggered from latest stable tag by default.

## Rollback And Recovery

CI recovery is commit-based. Runtime rollback is not implemented in U5. Partial apply diagnostics and backup records are the recovery evidence; adding automatic rollback would require a separate design because it changes failure semantics and target mutation ordering.

## Upstream Coverage

- `performance-design.md`: integration and benchmark checks cover render/apply/manifest/verification paths.
- `security-design.md`: no-write block, backup durability, prompt suppression, and manifest sequencing become blocking assertions.
- `scalability-design.md`: fixtures cover 2,000 operations, 500 backups, 50 MiB copy, and reporter row growth.
- `reliability-design.md`: result states, ordering invariants, and diagnostics become CI checks.
- `logical-components.md`: each U5 component has a corresponding pipeline test boundary.
- `components.md`: CI verifies File Applier and Manifest Store behavior without moving U4 policy into U5.
- `services.md`: GitHub Actions PR gates and manual release posture are preserved.
- `business-logic-model.md`: Apply, Manifest, Verification, Reporter, Prompt, and Error Handling define the test matrix.
