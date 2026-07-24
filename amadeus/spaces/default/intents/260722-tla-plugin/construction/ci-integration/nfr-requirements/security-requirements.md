# Security Requirements — U4 ci-integration

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Supply Chain

- eclipse-temurin imageはdigest固定、tla2tools.jarは版固定URLとSHA-256固定で検証する。
- job permissionsは`contents: read`を上限とし、secrets、write token、privileged containerを要求しない。
- model check実行containerはnetwork noneで動作する。

## Workflow 境界

- formal jobはverbatimなevent条件でdispatch限定とし、push/PRで実行不能にする。
- BASE_SHA空分岐はdispatchだけに作用し、既存push/PR差分計算を変更しない。
