# Code Summary — U8 Manual Release And Docs

> Stage: construction / code-generation  
> Unit: U8 Manual Release And Docs

## 概要

U8 は `@amadeus-dlc/setup` の手動リリース workflow、U7 gate を無条件再利用する release preflight、ユーザー向け installer docs、release/docs wiring テストを追加した。通常の push/PR/tag では publish せず、`workflow_dispatch` と protected environment 承認後のみ `npm publish` する。

## 追加・変更した成果物

### Maintainer release scripts (`packages/setup/src/maintainer/`)

- `release-tag-selector.ts`: latest stable / explicit tag 選択と prerelease dist-tag 検証。
- `release-preflight.ts`: release mode の `ReleaseValidationPlan` と `release-preflight.json` 集約。
- `build-package.ts`: publish 前 package metadata / dry-run / version alignment 検証。
- `release-evidence.ts`: SBOM lite と provenance evidence JSON 生成。
- `publish-validate.ts`: confirm_package、version/tag 整合、registry version conflict 検証。
- `post-publish-verify.ts`: npm metadata / tarball / docs consistency の post-publish チェック。
- `docs-consistency.ts`: root / setup README の installer-first 要件と `init` 禁止検証。

### GitHub Actions workflow

- `.github/workflows/release-setup.yml`: `workflow_dispatch` のみ起動。
  - jobs: input-and-tag、release-preflight（U7 gates 全実行）、build-and-evidence、docs-consistency、publish-validation、publish（`dry_run:false` のみ）、post-publish、release-summary。
  - publish は `environment: npm-publish` と `confirm_package: @amadeus-dlc/setup` を要求。

### User docs

- `README.md`: installer-first セクション追加、`amadeus-setup install` / `upgrade` を主導線化、manual `cp -r dist/<harness>/` を fallback 扱いに変更。
- `packages/setup/README.md`: package 利用、フラグ、manifest、手動リリース手順を日本語で整備。

### Tests

- `tests/unit/t210-setup-release-docs.test.ts`: tag selector、release preflight plan、publish/docs wiring、workflow contract を検証。

## 設計上の判断

- U7 の change detector skip は release workflow では使わず、selected tag checkout に対して gate を無条件実行する。
- SBOM/provenance は外部ツール依存を増やさず、package dry-run ベースの evidence JSON を生成する。実 publish 時は workflow 側で `npm publish --provenance` を 1 回だけ実行する。
- `@amadeus-dlc/setup` に runtime dependency は追加していない。

## 検証結果

- `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts tests/unit/t207-setup-apply-verify-ux.test.ts tests/unit/t208-setup-test-harness.test.ts tests/unit/t209-setup-ci-gates.test.ts tests/unit/t210-setup-release-docs.test.ts` — pass
- `bun run typecheck` — pass
- `bun run lint` — pass（既存 tests 側 warning/info のみ、exit 0）
- `bun packages/setup/src/maintainer/package-check.ts` — pass
- `git diff --check` — pass

## 完了境界

U1–U8 の installer 実装 unit が揃い、手動リリース surface とユーザー docs が design どおり配線された。次フェーズは delivery planning または実タグでの dry-run release 試行が自然な follow-up である。
