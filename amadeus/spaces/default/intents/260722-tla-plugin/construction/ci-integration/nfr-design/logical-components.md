# Logical Components — U4 ci-integration

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Components

| Component | Responsibility |
|---|---|
| event gate | dispatch限定job判定 |
| runtime bootstrap | fixed Bun/image/jar |
| U3 CLI step | isolated model check |
| artifact verifier | terminal contract検証 |
| uploader | failure時を含む証跡保存 |

## Boundaries

- 依存方向はevent gate → runtime bootstrap → U3 CLI → artifact verifier → uploader → terminal-stateとし、逆参照を禁止する。各stepは`{outcome, exitCode, evidencePaths}`をjob-local outputで次段へ渡す。
- 共有資源はjob workspace、verified jar、out directoryだけで、同一runner内に閉じる。uploaderはartifact serviceへの唯一のwriter、U3 CLIはout tempへの唯一のwriterである。

## Failure domains and blast radius

- bootstrap failureはU3 CLIをskipするが証跡生成以降をalways実行する。U3 failureはverifier/uploaderへ証跡として渡し、uploader failureはterminal-stateがjob failureとして所有する。
- formal jobはchanges/check/coverage/ci-successのneeds graphから独立させ、失敗を当該dispatch jobへ封じる。
- dispatch時のchangesはBASE_SHA空を検出して既存bandをskipへ収束させ、push/PR分岐を変更しない。各dispatchは独立runnerで隔離する。
