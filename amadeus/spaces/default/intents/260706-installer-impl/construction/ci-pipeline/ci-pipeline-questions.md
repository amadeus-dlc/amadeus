# CI Pipeline — Clarifying Questions

## Q1: 使用する CI ツールは何か？

**Answer**: GitHub Actions（`.github/workflows/ci.yml` と `.github/workflows/release-setup.yml`）。U7 code-generation で workflow を追加・更新済み。CodePipeline / Jenkins は使用しない。

## Q2: ブランチ戦略は？

**Answer**:

- **PR**: 任意ブランチ → `main` への pull_request で CI 全 job 実行
- **push**: `main` への push でも CI 実行
- **release**: `@amadeus-dlc/setup` は `workflow_dispatch` のみ（tag/push 自動 publish なし）

## Q3: マージ前に必要な品質ゲートは？

**Answer**（`build-and-test-summary.md` / `build-test-results.md` と整合）:

| Job | 必須条件 |
|-----|---------|
| `check` | typecheck、lint、dist/self-install drift、smoke+unit+integration |
| `installer-gates` | installer-related PR のみ GATE_REGISTRY 全 blocking gate pass |

non-installer PR は package-specific gate を skip して green。

## Q4: アーティファクトリポジトリは？

**Answer**:

- **CI レポート**: GitHub Actions artifact（`.amadeus-ci/setup/`）
- **npm publish**: `registry.npmjs.org`（U8 `release-setup.yml`、`npm-publish` environment + `NPM_TOKEN`）
- ECR / CodeArtifact / S3 は本 intent スコープ外

## Upstream References

- U7 `code-summary.md`: change-detector、gate-registry、ci.yml 配線
- `build-and-test-summary.md`: 122 unit + 8 integration pass、Standard strategy
- `build-test-results.md`: 2026-07-07 実行結果（全 pass）
