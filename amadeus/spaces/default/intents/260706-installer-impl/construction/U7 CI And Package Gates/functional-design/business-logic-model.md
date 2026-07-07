# Business Logic Model — U7 CI And Package Gates

> Stage: construction / functional-design  
> Unit: U7 CI And Package Gates  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U7 は installer-related PR を検出し、merge 前に `@amadeus-dlc/setup` の品質床を blocking gate として実行する。対象は `packages/setup/**`、installer tests、installer docs、release workflow、package metadata、installer-owned CI configuration である。U7 は release/publish を実行しない。U8 が `workflow_dispatch` release と publish validation の実行面を所有する。

## Gate Selection Workflow

1. Pull request の changed files を取得する。
2. `InstallerChangeDetector` が path pattern と package metadata relation を評価する。
3. installer-related でなければ U7 gate は skipped として成功する。ただし global secret scan が既存 CI にある場合はこの判定とは独立に残る。
4. installer-related なら `GatePlan` を生成する。
5. `GatePlan` は package gate、test gate、coverage gate、drift guard、security gate、metadata gate をすべて含む。
6. 各 gate を並列実行できるものは並列化し、依存関係があるものだけ順序付ける。
7. 1 つでも `failed` があれば PR check は failure になる。
8. `blocked-by-allowlist` は成功ではなく、allowlist record が有効な場合のみ `passed-with-exception` として扱う。

## Gate Plan

| Gate | Purpose | Blocking command owner | Failure result |
|---|---|---|---|
| package-dry-run | publish contents, bin, files allowlist を検証 | `packages/setup` scripts | package invalid |
| installer-smoke | `amadeus-setup --help` と minimal install/upgrade path を検証 | U6 harness | runtime invalid |
| installer-integration | fake ports/temp target で no-write/apply/manifest/verify を検証 | U6 harness | behavior invalid |
| coverage-registry | `covers:` registry の freshness と ratchet を検証 | U6 coverage registry | coverage stale/decreased |
| typecheck | TypeScript contract を検証 | repo/package script | type invalid |
| lint | style/static checks を検証 | repo/package script | lint invalid |
| dist-check | `dist/<harness>/` が source と drift していないことを検証 | existing package script | dist drift |
| promote-self-check | self-install promoted files が drift していないことを検証 | existing promote check | self-install drift |
| dependency-audit | runtime/publish tooling の High/Critical advisory を検出 | audit/OSV tool | vulnerability |
| secret-scan | verified secret を検出 | secret scanner | secret found |
| package-metadata | package name/bin/license/repository/files/root boundary を検証 | `checkPackageMetadata` | metadata invalid |

## Concrete Gate Execution Contract

U7 implementation must add these root-level scripts or equivalent GitHub Actions steps with the same command contract. All commands run from repository root unless `cwd` states otherwise. Outputs are written under `.amadeus-ci/setup/` and may be uploaded as CI artifacts.

| GateName | GitHub Actions check name | Command | cwd | Inputs | Output artifact | Pass/fail mapping | Timeout | Depends on | Path condition |
|---|---|---|---|---|---|---|---:|---|---|
| package-metadata | `installer / package-metadata` | `bun packages/setup/src/maintainer/package-check.ts --report .amadeus-ci/setup/package-metadata.json` | repo root | `packages/setup/package.json`, root `package.json` | `.amadeus-ci/setup/package-metadata.json` | exit 0 + `ok:true` passes; non-zero or `ok:false` fails | 2 min | none | installer-related |
| package-dry-run | `installer / package-dry-run` | `bun packages/setup/src/maintainer/package-dry-run.ts --report .amadeus-ci/setup/package-dry-run.json` | repo root | `packages/setup/**` | `.amadeus-ci/setup/package-dry-run.json` | exit 0 + tarball contents allowlist passes; any unexpected file fails | 3 min | package-metadata | installer-related |
| installer-smoke | `installer / smoke` | `bun tests/setup/run-installer-smoke.ts --report .amadeus-ci/setup/smoke.json` | repo root | U6 smoke fixtures, `packages/setup/**` | `.amadeus-ci/setup/smoke.json` | exit 0 + every smoke case passed; any failed case fails | 5 min | package-metadata | installer-related |
| installer-integration | `installer / integration` | `bun tests/setup/run-installer-integration.ts --report .amadeus-ci/setup/integration.json` | repo root | U6 temp target fixtures and fake ports | `.amadeus-ci/setup/integration.json` | exit 0 + all required coverage keys passed; any failure fails | 10 min | package-metadata | installer-related |
| coverage-registry | `installer / coverage-registry` | `bun packages/setup/src/maintainer/coverage-gate.ts --registry tests/.coverage-registry.json --ratchet tests/.coverage-ratchet.json --scope installer --report .amadeus-ci/setup/coverage.json` | repo root | `tests/.coverage-registry.json`, `tests/.coverage-ratchet.json`, U6 `covers:` headers | `.amadeus-ci/setup/coverage.json` | exit 0 + fresh registry + non-decreasing ratchet passes; stale or decreased fails | 3 min | installer-smoke, installer-integration | installer-related |
| typecheck | `installer / typecheck` | `bun run typecheck` | repo root | `tsconfig.json`, `tsconfig.tests.json`, setup/test sources | CI log | exit 0 passes; non-zero fails | 5 min | none | installer-related |
| lint | `installer / lint` | `bun run lint` | repo root | setup/test sources configured by lint script | CI log | exit 0 passes; non-zero fails | 5 min | none | installer-related |
| dist-check | `installer / dist-check` | `bun run dist:check` | repo root | `core/**`, `harness/**`, `scripts/package.ts`, `dist/**` | CI log | exit 0 passes; non-zero drift fails | 5 min | none | installer-related or source/dist path changed |
| promote-self-check | `installer / promote-self-check` | `bun run promote:self:check` | repo root | `dist/**`, `.claude/**`, `.codex/**`, `.agents/**`, `CLAUDE.md` | CI log | exit 0 passes; non-zero drift fails | 5 min | dist-check | installer-related or source/dist/self-install path changed |
| dependency-audit | `installer / dependency-audit` | `bun packages/setup/src/maintainer/security-gate.ts audit --findings .amadeus-ci/setup/dependency-findings.json --allowlist packages/setup/security/vulnerability-allowlist.json --report .amadeus-ci/setup/dependency-audit.json` | repo root | normalized dependency findings JSON, allowlist JSON | `.amadeus-ci/setup/dependency-audit.json` | exit 0 when no blocking finding or valid exception; exit 1 on blocking finding; exit 2 on invalid scanner/allowlist schema | 5 min | package-metadata | installer-related |
| secret-scan | `installer / secret-scan` | `bun packages/setup/src/maintainer/security-gate.ts secrets --findings .amadeus-ci/setup/secret-findings.json --report .amadeus-ci/setup/secret-scan.json` | repo root | normalized secret findings JSON | `.amadeus-ci/setup/secret-scan.json` | exit 0 when no verified secret; exit 1 on verified secret; exit 2 on invalid scanner schema | 5 min | none | installer-related or workflow/config path changed |

The scanner-producing step may use OSV, dependency-review, npm audit, gitleaks, trufflehog, or another tool in later CI Pipeline design, but it must write the normalized findings files consumed above before `security-gate.ts` runs. If the scanner step is absent on an installer-related PR, `security-gate.ts` exits 2 and the PR fails.

## Execution Algorithm

```text
buildInstallerGatePlan(changedFiles):
  classification = classifyInstallerChange(changedFiles)
  if classification.installerRelated is false:
    return GatePlan(status="skipped", gates=[])

  return GatePlan(
    status="required",
    gates=[
      packageMetadata,
      packageDryRun,
      typecheck,
      lint,
      installerSmoke,
      installerIntegration,
      coverageRegistry,
      distCheck,
      promoteSelfCheck,
      dependencyAudit,
      secretScan,
    ],
  )
```

`packageMetadata` は早く失敗できるが、他 gate の実行を省略しない。CI log は failure を一括で返す方が修正効率が高いため、`fail-fast` は dependency setup failure など実行不能な場合だけに限定する。

`InstallerChangeDetector` writes `.amadeus-ci/setup/change-set.json`. GitHub Actions can use that file to skip package-specific gates when `installerRelated:false`; the security gate must still fail if scanner output is malformed on a path where the gate is required.

## Dependency And Allowlist Workflow

1. scanner adapter が `.amadeus-ci/setup/dependency-findings.json` を normalized schema で書く。
2. `security-gate.ts audit` が schema を検証する。schema invalid は exit 2 の CI failure。
3. severity は lower-case `low|medium|high|critical` に正規化する。
4. reachability は `reachable:true` または `surface:"installer-runtime"|"publish-tooling"` の場合に blocking 対象とする。`surface:"dev-only"` は report only。
5. severity が Low/Medium なら U7 gate の blocking にはしないが report には残す。
6. High/Critical で reachable な finding は failure 候補にする。
7. allowlist を advisory id + package + affected range で照合する。
8. allowlist entry が存在し、reason / owner / expiry がすべて有効なら `passed-with-exception`。
9. allowlist が失効、理由なし、owner なし、range mismatch の場合は failure。

Allowlist path is fixed at `packages/setup/security/vulnerability-allowlist.json`. `expiresAt` is ISO 8601 date (`YYYY-MM-DD`) interpreted in UTC and expired when the CI run date is later than the date.

## Secret Scan Workflow

1. scanner adapter が `.amadeus-ci/setup/secret-findings.json` を normalized schema で書く。
2. `security-gate.ts secrets` が schema を検証する。schema invalid は exit 2 の CI failure。
3. `verified:true` の finding が 1 件でもあれば exit 1 の CI failure。
4. `verified:false` は report only として summary に出す。
5. finding は secret value を出力せず、file path、line、scanner rule id、fingerprint のみを report する。

## Coverage Registry And Ratchet Workflow

1. U6 が持つ `covers:` registry を読み込む。
2. registry entry が存在しない Must requirement/story は stale とする。
3. test file が削除または rename され registry が追従していなければ stale とする。
4. main branch baseline と PR の registry count/critical coverage key を比較する。
5. coverage key が減った場合は failure。新規 entry は baseline 更新対象として report する。
6. line coverage threshold ではなく、FR/US/NFR の traceable coverage を quality floor として扱う。

## Dist And Promote Drift Guard

`dist-check` は `dist/<harness>/` が source generator と一致していることを確認する。`promote-self-check` は generated distribution が repository-local self install surface へ昇格済みであることを確認する。U7 は `dist/<harness>/` を手編集しないし、CI でも自動修正しない。drift を検出したら失敗し、開発者に local regeneration と promotion を求める。

## CI Handoff To U8

U7 の成功は「release してよい」ではなく「release workflow に渡してよい artifact/source state」である。U8 はこの U7 gate plan を release workflow の preflight として再利用できるが、npm publish、SBOM/provenance 生成、post-publish verification は U8 が所有する。

## Upstream Coverage

- `unit-of-work.md`: U7 boundary である CI support と package validation を設計対象にする。
- `unit-of-work-story-map.md`: US-010 の installer-related PR gate flow を主 workflow にする。
- `requirements.md`: FR-016 の blocking gate list と allowlist policy を gate plan に展開する。
- `components.md`: Package Check と Release Workflow Contract を CI handoff として使う。
- `component-methods.md`: `checkPackageMetadata` を metadata gate、`ReleaseWorkflowContract` を U8 handoff contract として扱う。
- `services.md`: GitHub Actions PR Gates を外部 service boundary として扱い、npm publication は U8 に残す。
