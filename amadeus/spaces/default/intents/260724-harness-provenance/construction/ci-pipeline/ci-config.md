# CI Config — harness-provenance

上流入力(consumes 全数): `code-summary`、`build-and-test-summary`、`build-test-results`。

## 正本と変更方針

CIの唯一の正本は既存`.github/workflows/ci.yml`であり、本intentでは変更しない。`code-summary`のTypeScript・test・dist/self-install変更は既存path detectorで`full=true`、`drift=true`、`coverage=true`へ分類される。`build-and-test-summary`と`build-test-results`で実行したコマンドは既存workflowの品質面と一致するため、新規workflowや重複jobを追加しない。

triggerは`pull_request`、`main`への`push`、手動`workflow_dispatch`。PRはref単位で古いrunをcancelし、`main` pushはSHA単位で全runを完走させる。

## Job routing

| Route | 発火条件 | 主な処理 |
|---|---|---|
| `check` | framework/test TypeScript等で`full=true` | frozen install、typecheck、lint、complexity、dist/self-install drift、smoke+unit+integration |
| `drift-check` | 配布面のみで`drift=true`かつ`full=false` | dist/self-install drift |
| `coverage-head` / `coverage-base` / `coverage` | TypeScript/test等で`coverage=true` | head/base coverage、project gate、patch gate、relative gate |
| `ci-success` | 常時 | 適用対象jobの成功をfail-closedに集約 |
| `metrics-snapshot` | `main` pushかつcoverage成功 | snapshot PRを作成。PR blocking集約外だが失敗はloud |

## Runtime and dependencies

- Runner: `ubuntu-latest`
- Bun: `1.3.13`
- Install: `bun install --frozen-lockfile`
- Complexity tool: `lizard==1.23.0`
- Live Claude substrate: credentialがないrunnerでは既存test harnessが明示skip
- 新規secret、environment、service container、cache、外部CI provider: なし

## Artifact handling

CIは`amadeus-test-size-report`と`amadeus-coverage-report`をGitHub Actions artifactsへ14日保持する。release artifactはCIからpublishせず、既存`.github/workflows/release.yml`の人間起動`workflow_dispatch`がGitHub Releaseと`@amadeus-dlc/setup` npm provenance publishを所有する。本intentはversion、tag、release notes、npm artifactを生成しない。

## 検証方法

```bash
bun test tests/integration/t222-ci-snapshot-branch.integration.test.ts
printf '%s\0' \
  packages/framework/core/tools/amadeus-lib.ts \
  packages/framework/core/tools/amadeus-utility.ts \
  tests/unit/t269-harness-provenance.test.ts \
  tests/integration/t269-harness-provenance.cli.test.ts \
  tests/integration/t270-harness-provenance-birth.test.ts \
  | bash scripts/detect-ci-changes.sh
```

期待値は`full=true`、`drift=true`、`coverage=true`。workflow YAMLの変更は不要である。
