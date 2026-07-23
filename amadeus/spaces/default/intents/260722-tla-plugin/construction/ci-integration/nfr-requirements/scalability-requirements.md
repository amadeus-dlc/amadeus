# Scalability Requirements — U4 ci-integration

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 同時実行

- 各workflow_dispatchは独立GitHub runnerとworkspace/out artifactを使用し、共有mutable stateを持たない。
- 同時dispatch時も互いのmodel、jar、artifactを参照しない。

## 拡張方針

- 現在は1 model/1 job。モデル追加時はmatrix化を自動採用せず、30分予算とartifact識別を再設計する。
- 常駐runner、queue、外部schedulerは導入しない。
