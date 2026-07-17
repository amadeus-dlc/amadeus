# Integration Test Instructions — CodeKB hygiene verification handoff

## 適用範囲

`code-generation-plan.md`は新規API / database / queue / external dependencyを0件とし、`code-summary.md`はintegration対象となるapplication変更0件を確認している。このため新規contract test、E2E、LocalStack、testcontainerは追加しない。既存repositoryのcross-module / CLI / workflow integration caseを既存suite内で検証する。

## 実行方法

- Framework / configuration: 既存Bun runnerとrepository test inventory。
- Command: `bun run test:ci`。unitとintegrationを同じinventoryで実行するため、Build and Testでは1回のfresh suite実行を両分類の共通証拠として使う。
- Pass condition: integrationを含む全test fileでfailed files 0、failed assertions 0。
- Environment: local workspaceのみ。remote service、AWS account、customer dataは不要。

## Boundary validation

Repository suiteのgreenをU001固有のcontent contractの代理にしない。固定SHA上のmarker / H2 / ancestry / repeatabilityは`performance-test-instructions.md`の独立検査で確認し、CI、review、sensor、§13、gate、pushも別fieldのまま保持する。
