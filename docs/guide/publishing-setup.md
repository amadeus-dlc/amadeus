# Publishing `@amadeus-dlc/setup`

> Languages: **English** | [日本語](publishing-setup.ja.md)

> Audience: maintainers releasing Amadeus-DLC. The primary path is the CI
> release workflow (`.github/workflows/release.yml`) publishing with npm
> provenance; the manual commands remain documented as a fallback. (The
> original CON-004 "no CI auto-publish" constraint was superseded by user
> decision on 2026-07-09, consuming the SEC-P03 re-consideration point.)

The repo has **one version**: `packages/setup/package.json`'s version drives
the `vX.Y.Z` release tags, and `AMADEUS_VERSION` plus the README badge are
kept equal to it (t68 guards the alignment; the release-it `after:bump` hook
runs `scripts/release-version-sync.ts`). Generated `dist/` and self-install
trees remain untracked; the release workflow rebuilds them from the released
commit and publishes the distribution asset. One
tag is simultaneously the npm release of `@amadeus-dlc/setup` and the GitHub
tag the installer resolves framework distributions from. Release notes are
generated into the GitHub Release at release time — there is no CHANGELOG
file.

## 1. Prerequisites

Confirm all three before touching a version number:

- **npm org scope**: the `amadeus-dlc` npm org must own the `@amadeus-dlc`
  scope. Check with:

  ```bash
  npm org ls amadeus-dlc
  ```

  If this fails or shows a different owner, resolve the org/scope situation
  before proceeding (R1 — this is a human, pre-publish task, not something a
  release PR can fix).

- **Tags are created by the release workflow** — including the very first
  one: when no `v*` tag exists, a dispatch skips the bump and releases the
  committed version as-is. No manual tagging.

  ```bash
  git tag --list 'v*' | sort -V | tail -5
  ```

- **`NPM_TOKEN` repository secret** (CI path): a **granular automation
  token** scoped to publish only `@amadeus-dlc/setup`, stored as the
  `NPM_TOKEN` GitHub Actions secret. Prefer a short expiry and rotate on
  schedule. Automation tokens are exempt from the per-publish OTP, so the
  SEC-P02 posture shifts from "interactive 2FA on every publish" to "token
  custody": narrow scope, short life, revoke on suspicion.

- **npm account 2FA enabled** (manual fallback path, and account hygiene
  regardless of path): your npm account must have two-factor authentication
  set to `auth-and-writes` (SEC-P02):

  ```bash
  npm profile get
  ```

  Look for `two-factor auth: auth-and-writes`. If it says `auth-only` or
  disabled, enable it in your npm account settings first — this is a one-time
  account setting, not a per-publish step.

## 2. Bump the version

`packages/setup/package.json`'s `version` is an independent semver starting
at `0.1.0` (FR-017, BR-P06). **The release workflow bumps it for you** —
pick the bump level when dispatching (chapter 5); release-it bumps it, the
`after:bump` hook syncs `AMADEUS_VERSION` and the README badge, and those
tracked version surfaces are committed, tagged `vX.Y.Z`, and pushed to `main`
in one go. Generated output remains ignored and is rebuilt by the release job. The release commit lands on
`main` without a PR — an explicit, team-recorded exception to the PR rule,
limited to the release version sync.

Manual fallback:

```bash
cd packages/setup
npm version <patch|minor|major> --no-git-tag-version
```

Both paths keep `AMADEUS_VERSION` and the README badge equal to the package
version (one version axis — t68 enforces it).

## 3. Build and verify

```bash
# from the repo root
bun install --frozen-lockfile
bun run build
cd packages/setup && bun run build && cd -

bun run typecheck
bun run lint
bun run source-only:check

bash tests/run-tests.sh --ci
```

The CI profile includes the pack-contract test
(`tests/integration/setup-pack-contract.test.ts`) and the files-drift test
(`tests/integration/setup-files-drift.test.ts`) — both must be green before
proceeding.

Then run the real-network E2E, which exercises the live GitHub distribution
paths: a verified Release Asset for current versions and the source-archive
fallback only for versions published before the asset boundary:

```bash
AMADEUS_SETUP_E2E_NETWORK=1 bash tests/run-tests.sh --release
```

If `AMADEUS_SETUP_E2E_NETWORK` is unset, this test is skipped
(`test.skipIf`) — it is **not** run by default CI, so this step is mandatory
release-time verification, not optional.

## 4. Local final check

Inspect the tarball contents before publishing anything:

```bash
cd packages/setup
bun pm pack --dry-run
```

Expected output lists exactly 5 entries: `dist/cli.js`, `LICENSE-MIT`,
`LICENSE-APACHE`, `package.json`, `README.md`. Anything else (a stray
`src/*.ts`, a test file) means the `files` field has drifted — stop and fix
it before publishing (the pack-contract test in step 3 should already have
caught this, but this is the last visual check before a real publish).

Then install the actual tarball locally and smoke-test it:

```bash
bun pm pack
mkdir -p /tmp/amadeus-setup-smoke && cd /tmp/amadeus-setup-smoke
bun add /path/to/packages/setup/amadeus-dlc-setup-<version>.tgz
bunx amadeus-setup --help
```

(`bun link` from `packages/setup` is an acceptable substitute for the tarball
install step.)

## 5. Publish

### Primary path: one-button CI release (with npm provenance)

From the Actions tab, run **Release @amadeus-dlc/setup** on `main` and pick
the bump level (patch / minor / major). One run does everything:

1. release-it bumps `packages/setup/package.json`; the `after:bump` hook
   (`scripts/release-version-sync.ts`) syncs `AMADEUS_VERSION` and the README
   badge; the tracked version surfaces are committed, tagged `vX.Y.Z`, and
   pushed to `main` (config:
   `packages/setup/.release-it.json`)
2. `build-dist` checks out that exact commit, installs with Bun 1.3.13, builds
   every harness, runs the full CI test profile, enforces the source-only
   boundary and graph invariants, and creates a deterministic
   `amadeus-dist-vX.Y.Z.tar.gz`, its manifest, and `SHA256SUMS`
3. softprops/action-gh-release creates the GitHub Release with auto-generated
   notes and attaches all three distribution files
4. `dist/cli.js` is built fresh and published with
   `npm publish --provenance --access public` (a prerelease version is
   automatically published with `--tag next` and never touches `latest`)
5. post-publish verification is performed manually with Bun after registry
   propagation completes

The release deliberately re-runs the full CI test profile before constructing
the asset. The release job owns the public distribution bytes; a local `dist/`
edit cannot enter the Git history or this clean-checkout build.

The **first release** needs no special handling: with no `v*` tag in the
repo, the dispatch skips the bump and releases the committed version as-is
(`release-it --no-increment`, tag only). Pushing a `vX.Y.Z` tag manually
remains a fallback entry point — it skips the bump (the tag must match the
committed package version and point at `main`) and runs notes → build →
publish.

To rehearse without releasing, dispatch with `dry-run: true` —
release-it runs with `--dry-run` (no commit/tag/push), distribution asset
creation is skipped, and `npm publish --dry-run` replaces the real publish; no
`NPM_TOKEN` is needed.

### Fallback: manual publish (no provenance)

If CI is unavailable, the original manual path still works (note: manual
publishes carry **no provenance**):

Stable release:

```bash
cd packages/setup
npm publish --access public
```

Prerelease (`X.Y.Z-rc.N` version, does not touch the `latest` dist-tag):

```bash
cd packages/setup
npm version <version>-rc.<N> --no-git-tag-version
npm publish --access public --tag next
```

## 6. Post-publish verification

Verify manually (the workflow intentionally has no in-run bunx smoke —
registry propagation lag right after publish made it a false-alarm source):

```bash
bunx @amadeus-dlc/setup@<version> --help
```

Then check the package page at
`https://www.npmjs.com/package/@amadeus-dlc/setup` and confirm the `license`
and `repository` metadata match `packages/setup/package.json`.

## 7. Rollback

npm publishes are not reversible in the general case — `npm unpublish` is
restricted and discouraged by npm's own policy, so it is not the rollback
path here. If a published version has a defect:

1. Deprecate the broken version:

   ```bash
   npm deprecate @amadeus-dlc/setup@<broken-version> "description of the issue; use <fixed-version> instead"
   ```

2. Publish a patch release with the fix, following steps 2-6 above.

Do not attempt to unpublish and re-publish the same version number.
