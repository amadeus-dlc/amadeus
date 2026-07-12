# セキュリティテスト手順

## 適用範囲と上流追跡

`code-generation-plan.md` と `code-summary.md`、security designのS-1〜S-4を対象とする。本featureは公開repository由来の統計だけを扱い、認証、外部入力、DB、network endpointを追加しないためDASTは非適用である。

## 実行方法

```sh
bun tests/run-tests.ts --unit --filter t222-ci-snapshot-wiring
bun run lint:check
bun run typecheck
```

workflow testでjob単位 `contents: write`、`secrets.*` 非参照、download artifact名 `amadeus-coverage-report` を確認する。top-level `contents: read`、他jobのread、bot authorは `.github/workflows/ci.yml` の静的inspectionで確認する。今回のfocused testは実collector happy pathと注入済みcollector failureを対象とし、malformed/non-finite JSONや実lizard failureの個別注入は含まない。

## 合格基準

- credentialや新規secret参照が追加されていないこと。
- t222でmetrics-snapshot jobのwrite権限を確認し、top-level read・他job read・bot authorは静的inspection結果を記録すること。
- 注入済みcollector failureとwriter failureがloud-failし、writer failure時に部分snapshotを残さないこと。
- dependency追加がないため新規dependency CVE scanは非適用。repository既存scanはCI側の責務として維持する。
