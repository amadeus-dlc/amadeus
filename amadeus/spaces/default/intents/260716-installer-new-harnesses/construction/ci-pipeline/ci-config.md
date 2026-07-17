# CI Config — Issue #1048(既存正本の文書化 — ci-pipeline:c2)

上流入力(consumes 全数): `../installer-enum-extension/code-generation/code-summary.md`、`../build-and-test/build-and-test-summary.md`、`../build-and-test/build-test-results.md`。

## 正本

`.github/workflows/ci.yml`(push / pull_request)— 本 intent での変更なし(Bolt 1 diff に workflow 不含、infrastructure-design/cicd-pipeline.md で実 workflow 突合済み)。

## ジョブ構成(実測 — cicd-pipeline.md :96/:99/:108/:111/:114/:125-243 の照合済み台帳)

| ジョブ | コマンド |
|---|---|
| typecheck | `bun run typecheck` |
| lint | `bun run lint`(Biome) |
| dist drift | `bun run dist:check` |
| self-install drift | `bun run promote:self:check` |
| tests | `bash tests/run-tests.sh --ci`(smoke+unit+integration) |
| coverage | self-hosted patch gate+relative gate |

## PR #1109 での発火実績

pull_request で上記全ジョブが発火 — green 確認は leader のマージ前実測に委譲(auto マージ運用)。
