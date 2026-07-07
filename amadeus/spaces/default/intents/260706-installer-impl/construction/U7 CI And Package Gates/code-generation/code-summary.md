# Code Summary — U7 CI And Package Gates

> Stage: construction / code-generation  
> Unit: U7 CI And Package Gates

## 概要

U7 は installer-related PR を検出し、`@amadeus-dlc/setup` 向けの blocking gate を GitHub Actions と maintainer scripts で配線した。publish や npm token は扱わず、U8 が再利用できる `.amadeus-ci/setup/` レポートを生成する。

## 追加・変更した成果物

### Maintainer gate scripts (`packages/setup/src/maintainer/`)

- `change-detector.ts`: PR changed files から installer-related 判定と `change-set.json` 出力。
- `gate-registry.ts` / `gate-planner.ts`: Concrete Gate Execution Contract に沿った `GatePlan` 生成。
- `package-dry-run.ts`: `files` allowlist ベースの publish contents 検証（npm token 不要）。
- `coverage-gate.ts`: U6 `covers:` handoff の freshness と `tests/.coverage-ratchet.json` の `installer` ratchet 検証。
- `security-gate.ts`: normalized dependency/secret findings と allowlist 判定（exit 0/1/2）。
- `scanner-adapters.ts`: 追加依存なしの builtin scanner adapter。normalized JSON を `.amadeus-ci/setup/` に書く。
- `package-check.ts`: `--report` フラグで JSON artifact 出力に対応。

### Security policy

- `packages/setup/security/vulnerability-allowlist.json`: High/Critical 例外の明示 rationale / owner / expiry を格納。初回は空配列。

### CI runners (`tests/setup/`)

- `run-installer-smoke.ts`: `--help` と bun-required smoke を JSON レポート化。
- `run-installer-integration.ts`: U6 harness ベースの 6 coverage key を JSON レポート化。

### CI workflow

- `.github/workflows/ci.yml`: 既存 `check` job を維持しつつ `installer-gates` job を追加。
  - installer-related PR のみ package-metadata / dry-run / smoke / integration / coverage / dependency-audit / secret-scan を実行。
  - non-installer PR は package-specific gate を skip して成功終了。
  - `.amadeus-ci/setup/` を artifact として保存。

### Coverage ratchet

- `tests/.coverage-ratchet.json`: framework ratchet に加え `installer` baseline を追加。

### Tests

- `tests/unit/t209-setup-ci-gates.test.ts`: change detector、gate registry/planner、package dry-run、security gate、coverage gate、allowlist wiring を検証。

## 設計上の判断

- scanner 具体ツール（OSV/gitleaks 等）は CI Pipeline 側の選択肢として残し、blocking 判定は normalized schema + `security-gate.ts` に固定した。
- `@amadeus-dlc/setup` に runtime dependency は追加していない。root devDependencies は `dev-only` surface として report only。
- dist/promote drift guard は既存 `check` job が global に実行し、U7 planner は source/dist/self-install 変更時に gate plan へ含める。

## 検証結果

- `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts tests/unit/t207-setup-apply-verify-ux.test.ts tests/unit/t208-setup-test-harness.test.ts tests/unit/t209-setup-ci-gates.test.ts` — 107 pass
- `bun run typecheck` — pass
- `bun run lint` — pass（既存 tests 側 warning/info のみ、exit 0）
- `bun packages/setup/src/maintainer/package-check.ts` — pass
- `git diff --check` — pass

## U8 handoff

U7 成功時に `.amadeus-ci/setup/` へ package-metadata、dry-run、smoke、integration、coverage、dependency-audit、secret-scan レポートが残る。U8 release workflow はこれらを preflight として再実行できるが、publish/SBOM/provenance は U8 が所有する。
