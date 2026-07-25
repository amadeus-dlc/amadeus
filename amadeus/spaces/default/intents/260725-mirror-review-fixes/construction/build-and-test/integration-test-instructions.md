# Integrationテスト手順

## 対象境界

[code-generation-plan.md](../%7Bunit-name%7D/code-generation/code-generation-plan.md) と [code-summary.md](../%7Bunit-name%7D/code-generation/code-summary.md) に基づき、CLI→lifecycle→policy/state、filesystem safe-open、coverage集約、生成配布面、CI workflowの境界を検証する。GitHub mutationは注入portまたはstubを使用し、実Issueを変更しない。

## 実行コマンド

```bash
bun test \
  tests/integration/t232-amadeus-mirror.integration.test.ts \
  tests/integration/t257-amadeus-mirror-config.integration.test.ts \
  tests/integration/t268-amadeus-mirror-contract-policy.integration.test.ts \
  tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts \
  tests/integration/t-formal-verif-ci-workflow.integration.test.ts
```

全配布面との統合は次で検証する。

```bash
bun run dist:check
bun run promote:self:check
```

## 成功条件

- legacy CLIが直接`gh` mutationへ到達しない。
- prompt回答は永続化済みbinding以外を拒否し、再回答で副作用を起こさない。
- TOCTOU差し替えでroot外内容を採用しない。
- formal CI baselineがPR #1469のMirror CIジョブを含む現行workflowと一致する。
- 生成コピーに正本との差分がない。
