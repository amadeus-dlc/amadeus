# Code Summary — U6 Installer Test Harness

## 実装ファイル

- `tests/helpers/setup/fixtures.ts`
  - 共通定数、`md5`、`distributionFile`、`installerManifest`、`loadedDistribution`、command builder、`createTempWorkspace` を追加した。
- `tests/helpers/setup/fake-ports.ts`
  - `fakeTagSource`、`fakeArchiveSource`（transient retry / failure）、`FakeTargetFiles`、`StubManifestReader`、`fakePromptPort` を追加した。
- `tests/helpers/setup/source-fixtures.ts`
  - tar.gz archive builder、codex distribution directory seeder、archive entry builder を追加した。
- `tests/helpers/setup/target-fixtures.ts`
  - clean / manifest-installed / manual-or-unknown / partial / none / unsupported / ambiguous-harness の temp target fixture builder を追加した。
- `tests/helpers/setup/snapshot.ts`
  - temp path、timestamp、backup timestamp を正規化する `normalizeInstallerOutput` と `stablePlanSnapshot` を追加した。
- `tests/helpers/setup/coverage.ts`
  - t202–t208 の setup test file 一覧と `covers:` header handoff helper を追加した。
- `tests/helpers/setup/index.ts`
  - harness module の re-export を追加した。
- `tests/unit/t208-setup-test-harness.test.ts`
  - harness self-test、integration test（clean install、manifest-first upgrade no-write、collision no-write、archive retry failure、kiro ambiguity）、smoke test（help、bun-required）を追加した。

## 判断

- U6 は runtime installer behavior を追加せず、U1–U5 contracts を fake ports と isolated temp directories で検証可能にする test support layer とした。
- 既存 t202–t207 はこの slice では変更せず、harness helpers を新設して incremental migration を可能にした。
- temp target fixture は valid manifest md5 と codex sentinel paths を含め、manifest-first detection と upgrade policy を正しく表現する。
- coverage handoff は installer-specific `covers:` header を列挙し、U7 CI が setup test surface を機械的に参照できるようにした。
- snapshot normalizer は host-specific temp path と timestamp を placeholder に置換し、reporter output の安定比較を可能にした。

## テスト

- harness builders:
  - deterministic distribution metadata
  - fake port retry / failure controls
  - isolated temp target states
  - snapshot normalization
  - coverage handoff for t202–t208
- integration:
  - clean install to temp target with fake ports
  - manifest-first upgrade no-write when already current
  - non-interactive collision no-write
  - archive fetch failure leaves target untouched
  - kiro / kiro-ide ambiguity resolution via prompt
  - plan/report snapshot consistency
- smoke:
  - Bun entrypoint `--help`
  - Node wrapper `bun-required` without Bun on PATH

## 検証

- `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts tests/unit/t207-setup-apply-verify-ux.test.ts tests/unit/t208-setup-test-harness.test.ts` — 91 pass
- `bun run typecheck` — pass
- `bun run lint` — pass（既存 tests 側 warnings/infos のみ）
- `bun packages/setup/src/maintainer/package-check.ts` — pass
- `git diff --check` — pass
