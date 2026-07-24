# Scalability Design — U4 ci-integration

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Dispatch isolation

- 各dispatchはGitHub管理の独立runner、workspace、runId付きartifactを使用し、mutable stateを共有しない。
- artifact nameへrun IDとattemptを含め、rerunや同時実行の上書きを防止する。

## Growth

- 現在は1 model/1 job。model追加時は30分予算とartifact schemaを再承認してからmatrix化する。
- self-hosted runner、外部queue、schedulerは導入しない。
