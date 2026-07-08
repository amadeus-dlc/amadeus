# Publishing `@amadeus-dlc/setup`

> Audience: maintainers preparing an `@amadeus-dlc/setup` release. The
> primary path is the CI release workflow (`.github/workflows/release.yml`,
> triggered by a `setup-vX.Y.Z` tag) publishing with npm provenance; the
> manual commands remain documented as a fallback. (The original CON-004
> "no CI auto-publish" constraint was superseded by user decision on
> 2026-07-09, consuming the SEC-P03 re-consideration point.)

`@amadeus-dlc/setup` (`packages/setup`) has its own independent semver,
separate from the framework's `AMADEUS_VERSION` (FR-017). It is **not**
covered by the framework's `vX.Y.Z` git tag, CHANGELOG, or README-badge sync
that t68 enforces — the setup package uses its own `setup-vX.Y.Z` tag
namespace, which only drives the release workflow.

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

- **`vX.Y.Z` framework tag exists**: `@amadeus-dlc/setup` itself is not
  tagged, but at least one stable framework tag must exist in the repository
  (CON-007/ASM-006), since the installer's default version resolution (FR-006)
  depends on it:

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
pick the bump level when dispatching (chapter 5); release-it commits the
bump, tags `setup-vX.Y.Z`, and pushes to `main` in one go. The bump commit
lands on `main` without a PR — an explicit, team-recorded exception to the
PR rule, limited to release-it's one-line version change.

Manual fallback:

```bash
cd packages/setup
npm version <patch|minor|major> --no-git-tag-version
```

Neither path touches the framework's `AMADEUS_VERSION`, README badge, or
CHANGELOG — those stay in sync with each other per t68, independently of this
version.

## 3. Build and verify

```bash
# from the repo root
cd packages/setup && bun run build && cd -

bun run typecheck
bun run lint

bash tests/run-tests.sh --ci
```

The CI profile includes the pack-contract test
(`tests/integration/setup-pack-contract.test.ts`) and the files-drift test
(`tests/integration/setup-files-drift.test.ts`) — both must be green before
proceeding.

Then run the real-network E2E, which exercises the actual GitHub codeload
archive shape (a single top-level wrapper directory) against the live
repository — the only guard against a GitHub archive-format drift breaking
installs in the field:

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
npm pack --dry-run
```

Expected output lists exactly 5 entries: `dist/cli.js`, `LICENSE-MIT`,
`LICENSE-APACHE`, `package.json`, `README.md`. Anything else (a stray
`src/*.ts`, a test file) means the `files` field has drifted — stop and fix
it before publishing (the pack-contract test in step 3 should already have
caught this, but this is the last visual check before a real publish).

Then install the actual tarball locally and smoke-test it:

```bash
npm pack
mkdir -p /tmp/amadeus-setup-smoke && cd /tmp/amadeus-setup-smoke
npm install /path/to/packages/setup/amadeus-dlc-setup-<version>.tgz
npx amadeus-setup --help
```

(`bun link` from `packages/setup` is an acceptable substitute for the tarball
install step.)

## 5. Publish

### Primary path: one-button CI release (with npm provenance)

From the Actions tab, run **Release @amadeus-dlc/setup** on `main` and pick
the bump level (patch / minor / major). One run does everything:

1. release-it bumps `packages/setup/package.json`, commits, tags
   `setup-vX.Y.Z`, and pushes to `main` (config:
   `packages/setup/.release-it.json`)
2. softprops/action-gh-release creates the GitHub Release with
   auto-generated notes
3. `dist/cli.js` is built fresh and published with
   `npm publish --provenance --access public` (a prerelease version is
   automatically published with `--tag next` and never touches `latest`)
4. a retrying `npx @amadeus-dlc/setup@<version>` smoke check closes the run

The release does not re-run tests: every commit on `main` already passed
the five CI quality gates at PR time, and the bump commit itself is
release-it's one-line version change.

Pushing a `setup-vX.Y.Z` tag manually remains a fallback entry point — it
skips the bump (the tag must match the committed package version and point
at `main`) and runs notes → build → publish → smoke.

To rehearse without releasing, dispatch with `dry-run: true` —
release-it runs with `--dry-run` (no commit/tag/push) and `npm publish
--dry-run` replaces the real publish; no `NPM_TOKEN` is needed.

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

The release workflow already performs a retrying `npx` smoke check after
publishing. Verify manually as well:

```bash
npx @amadeus-dlc/setup@<version> --help
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
