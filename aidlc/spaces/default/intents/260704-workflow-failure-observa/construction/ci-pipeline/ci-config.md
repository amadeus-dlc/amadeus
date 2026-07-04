# CI Config

## 入力成果物

この `ci-config` は、各 Unit の `code-summary`、`build-and-test-summary`、`build-test-results` を入力として作成した。

U001 は OpenTelemetry core 計装、error evidence、hook drop doctor を追加した。

U002 は `SUBAGENT_COMPLETED` の outcome evidence を追加した。

U003 は workflow warning と Requirement traceability を追加した。

## Existing CI

既存 CI は GitHub Actions である。

設定ファイルは `.github/workflows/ci.yaml` である。

現在の workflow は `push` to `main` と `pull_request` で起動する。

CI job は Bun を設定し、`bun install --frozen-lockfile` の後に `npm run test:all` を実行する。

## Current Pipeline Shape

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  contents: read

jobs:
  mock:
    runs-on: ubuntu-latest
    env:
      AMADEUS_LLM_PROVIDER: mock
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: npm run test:all
```

この構成は、今回追加した package scripts を自動的に含む。

`test:it:all` に U001、U002、U003 の eval が追加されたためである。

## Recommended CI Policy

CI workflow 本体はこの stage では変更しない。

理由は、既存 workflow が `npm run test:all` を単一 gate として実行し、parity failure を検出できているためである。

PR merge は人間が実行する。

CI は merge 判断の入力であり、merge 操作を自動実行しない。

## Local CI Equivalence

CI と同等の確認は次で行う。

```bash
npm run test:all
```

ただし、現在は `parity:check` で停止する。

個別確認は次で行う。

```bash
npm run typecheck
npm run lint:check
npm run contracts:check
npm run parity:check
npm run claude-wiring:check
npm run test:it:all
npm run test:it:engine-e2e
npm run diff:check
```

## Artifact Repository

この Intent では artifact repository を使わない。

ECR、CodeArtifact、S3 への publish は行わない。

生成物は target workspace の source code、eval、Amadeus DLC 成果物である。
