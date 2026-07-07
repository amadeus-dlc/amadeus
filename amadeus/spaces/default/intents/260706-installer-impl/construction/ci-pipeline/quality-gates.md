# Quality Gates — インストーラ実装

## Upstream Inputs

U7 `code-summary.md` の Concrete Gate Execution Contract と `build-test-results.md` の検証結果に基づく。ゲート定義の SSOT は `packages/setup/src/maintainer/gate-registry.ts`。

## Merge Blocking Gates (PR)

### Global `check` job（全 PR）

| Gate | Command | Blocking | Notes |
|------|---------|:--------:|-------|
| typecheck | `bun run typecheck` | Yes | repo + tests |
| lint | `bun run lint` | Yes | Biome |
| dist-check | `bun run dist:check` | Yes | packaging drift |
| promote-self-check | `bun run promote:self:check` | Yes | self-install sync |
| test tier | `bash tests/run-tests.sh --ci` | Yes | smoke + unit + integration |

### Installer-specific `installer-gates` job

**前提**: `change-detector.ts` が `installerRelated: true` を返す PR のみ。それ以外は skip（blocking なし）。

| Gate Name | checkName | pathCondition | dependsOn |
|-----------|-----------|---------------|-----------|
| package-metadata | installer / package-metadata | installer-related | — |
| package-dry-run | installer / package-dry-run | installer-related | package-metadata |
| installer-smoke | installer / smoke | installer-related | package-metadata |
| installer-integration | installer / integration | installer-related | package-metadata |
| coverage-registry | installer / coverage-registry | installer-related | smoke, integration |
| typecheck | installer / typecheck | installer-related | — |
| lint | installer / lint | installer-related | — |
| dist-check | installer / dist-check | source/dist changed | — |
| promote-self-check | installer / promote-self-check | source/dist/self-install | dist-check |
| scanner-findings | installer / scanner-findings | installer-related | package-metadata |
| dependency-audit | installer / dependency-audit | installer-related | scanner-findings |
| secret-scan | installer / secret-scan | workflow/config changed | scanner-findings |

実行は `run-installer-gates.ts` が planner 出力に従い **dependsOn** 順序を尊重。

## Security Gates

| Gate | Input | Policy |
|------|-------|--------|
| dependency-audit | `.amadeus-ci/setup/dependency-findings.json` | High/Critical reachable → block（allowlist 例外のみ） |
| secret-scan | `.amadeus-ci/setup/secret-findings.json` | verified secret → block |

Allowlist: `packages/setup/security/vulnerability-allowlist.json`（schemaVersion + rationale + expiry）

Scanner 実装: `scanner-adapters.ts`（normalized JSON を `.amadeus-ci/setup/` に出力）

## Coverage Gate

```text
bun packages/setup/src/maintainer/coverage-gate.ts \
  --registry tests/.coverage-registry.json \
  --ratchet tests/.coverage-ratchet.json \
  --scope installer \
  --integration-report .amadeus-ci/setup/integration.json \
  --report .amadeus-ci/setup/coverage.json
```

- U6 `covers:` handoff freshness
- `tests/.coverage-ratchet.json` の `installer` baseline ratchet
- integration coverage keys 安定性（t209 検証済み）

## Release Gates (U8 — manual only)

Release preflight は installer-related PR skip を**行わず**、選択 tag 上で U7 全 gate を unconditional 実行。

追加 gate:

| Gate | Script | Blocking |
|------|--------|:--------:|
| build-package | `build-package.ts` | Yes |
| release-evidence | `release-evidence.ts` | Yes |
| docs-consistency | `docs-consistency.ts` | Yes |
| publish-validate | `publish-validate.ts` | Yes |
| npm publish | `npm publish --provenance` | Yes（dry_run=false + confirm） |
| post-publish-verify | `post-publish-verify.ts` | Yes |

## Verification Status (from build-test-results)

| Layer | Status |
|-------|--------|
| Unit t202–t210 | 122 pass |
| Smoke | 2 pass |
| Integration | 6 pass |
| CI workflow YAML | リポジトリに存在、U7 code-summary と一致 |

## Known Overlap / Tradeoffs

- `check` job と installer-gates の typecheck/lint は installer PR で二重実行（defense-in-depth）
- dist/promote は global check が常時実行、installer planner は path 条件付きで追加実行
