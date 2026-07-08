# Publishing `@amadeus-dlc/setup`

> Audience: maintainers preparing an `@amadeus-dlc/setup` release. This is a
> manual runbook — there is no CI auto-publish (CON-004) and no npm
> provenance (SEC-P03) for the first release.

`@amadeus-dlc/setup` (`packages/setup`) has its own independent semver,
separate from the framework's `AMADEUS_VERSION` (FR-017). It is **not**
covered by the `vX.Y.Z` git tag, CHANGELOG, or README-badge sync that t68
enforces for the framework — no setup-specific git tag is cut.

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

- **npm account 2FA enabled**: your npm account must have two-factor
  authentication set to `auth-and-writes` (SEC-P02) before you can publish:

  ```bash
  npm profile get
  ```

  Look for `two-factor auth: auth-and-writes`. If it says `auth-only` or
  disabled, enable it in your npm account settings first — this is a one-time
  account setting, not a per-publish step.

## 2. Bump the version

`packages/setup/package.json`'s `version` is an independent semver starting
at `0.1.0` (FR-017, BR-P06). Bump it in the same PR that will publish:

```bash
cd packages/setup
npm version <patch|minor|major> --no-git-tag-version
```

This does **not** touch the framework's `AMADEUS_VERSION`, README badge, or
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

**Note: this release has no npm provenance** (SEC-P03 — CI-based publishing
with provenance is a re-consideration point for a future move to automated
releases; the current process is manual).

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
