# CI/CD Pipeline — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-design/performance-design.md`、`../nfr-design/security-design.md`、`../nfr-design/scalability-design.md`、`../nfr-design/reliability-design.md`、`../nfr-design/logical-components.md`、`../../../inception/application-design/components.md`、`../../../inception/application-design/services.md`、`../functional-design/business-logic-model.md`。

## 方針(ci-pipeline:c2 — 既存 workflow を唯一の正本とし、新規生成しない)

既存 GitHub Actions(push / pull_request)が本 unit の全検証を既にカバーする:

| 検証 | 既存ジョブ面 |
|---|---|
| typecheck / lint | `bun run typecheck` / `bun run lint`(Biome) |
| dist・self-install ドリフト | `bun run dist:check` / `bun run promote:self:check` — C6 の8ミラー regen 漏れを機械検出 |
| テスト | `bash tests/run-tests.sh --ci`(smoke+unit+integration)— 契約テスト6値化・fixture 完走・AC-6e worktree 解決テストを自動包含 |
| カバレッジ | self-hosted patch gate+relative gate — 新規行の in-process 被覆(C-6、push 前ローカル lcov 実測が前置) |

## 変更

workflow ファイルへの変更なし。新規ジョブ・新規 gate の追加なし(比例選定 — SR-4 継承)。

## リリース

release.yml(workflow_dispatch)の既存一本 — 本 unit 非接触(deployment-architecture.md と同一制約)。
