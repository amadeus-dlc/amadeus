# Unit Test Instructions — インストーラ実装

## Upstream Inputs

U1–U8 の `code-summary.md` に記載の unit test（`tests/unit/t202`–`t210`）を Standard test strategy の主検証対象とする。各 test は `covers:` ヘッダで FR/US を trace する。

## Test Scope

| ファイル | Unit | 重点 |
|---------|------|------|
| `t202-setup-package-shell.test.ts` | U1 | parser、help、boundary、metadata |
| `t203-setup-version-resolver.test.ts` | U2 | SemVer ordering、prerelease、explicit version |
| `t204-setup-source-distribution.test.ts` | U2 | archive、metadata、service boundary |
| `t205-setup-target-state.test.ts` | U3 | detection、snapshot、service |
| `t206-setup-operation-planning.test.ts` | U4 | install/upgrade plan、backup、no-write |
| `t207-setup-apply-verify-ux.test.ts` | U5 | applier、reporter、orchestration |
| `t208-setup-test-harness.test.ts` | U6 | fixtures、fake ports、harness integration |
| `t209-setup-ci-gates.test.ts` | U7 | change detector、gate registry、security |
| `t210-setup-release-docs.test.ts` | U8 | release preflight、publish、docs |

## Command

フル installer unit suite:

```bash
bun test tests/unit/t202-setup-package-shell.test.ts \
  tests/unit/t203-setup-version-resolver.test.ts \
  tests/unit/t204-setup-source-distribution.test.ts \
  tests/unit/t205-setup-target-state.test.ts \
  tests/unit/t206-setup-operation-planning.test.ts \
  tests/unit/t207-setup-apply-verify-ux.test.ts \
  tests/unit/t208-setup-test-harness.test.ts \
  tests/unit/t209-setup-ci-gates.test.ts \
  tests/unit/t210-setup-release-docs.test.ts
```

単一 unit の targeted run（例: U5）:

```bash
bun test tests/unit/t207-setup-apply-verify-ux.test.ts
```

## Expected Coverage

- **122 tests / 387 assertions** が pass（2026-07-07 時点）
- live GitHub / real filesystem mutation なし（fake ports と temp fixtures）
- `canApply: false` は applier invariant throw（no-write path は service 側）

## Test Data

- `tests/helpers/setup/fake-ports.ts`: FakeTargetFiles、fakeTagSource、fakeArchiveSource
- `tests/helpers/setup/target-fixtures.ts`: harness target layouts
- `.amadeus-ci/setup/` は CI gate runner 用（local unit では不要）
