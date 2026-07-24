# Scalability Design — U3 run-model-check

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Execution unit

- 1 CLI=1 model/cfg/outとし、複数modelは独立GitHub jobまたは順次invocationとして管理する。
- runIdをcontainer名、temp dir、manifestへ付与し、異なるrealpath workspace/outだけを同時実行可能にする。

## Growth

- queue、distributed scheduler、suite runnerは導入しない。1 runner内同時実行1を維持する。
- planner追加は`buildArgv`、`snapshotEnvironment`、`verifyEnvironment`、receipt inspection集合を実装する。
