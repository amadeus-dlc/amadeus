# Logical Components — U3 run-model-check

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Components

| Component | Responsibility |
|---|---|
| args/parser | parse-only CLI boundary |
| planner selector | Darwin/Docker選択 |
| spawn planner | snapshot、verify、argv、receipt |
| TLC toolchain | acquire、run、normalize |
| artifact publisher | terminal manifestとatomic publish |
| outcome adapter | exit/stderr JSON写像 |

## Failure domains

- 依存方向はargs/parser → planner selector → spawn planner → TLC toolchain → artifact publisher → outcome adapterとし、逆importを禁止する。
- plannerはEnvReceipt、toolchainは`{outcome, stdout, stderr, counterexample?}`、publisherは`PublishResult`を同期Resultで次段へ渡す。publisherだけがout/tempへwriteし、検証済みjar cacheはplannerがread-only所有する。
- planner検証失敗はspawn前、TLC異常はrun内、artifact不整合はpublish前に隔離する。publisher失敗はoutcome adapterがHARNESS_ERROR/exit 2とstderr JSONへ写像し、二重writeや成功manifestを禁止する。
- 共有資源はcontent-addressed jar/image cacheだけで、workspace/out/temp/container名はrunIdで分離する。
