# Scalability Requirements — U3 run-model-check

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 実行単位

- CLIは単一モデル・単一cfg・単一out dirを処理する。複数モデルは呼出し側が独立 invocation として管理する。
- 同時実行は`realpath`で異なるworkspace/out dirを前提とし、既存out・symlink・親子関係のoutを `OUT_CONFLICT` で拒否する。同一model/cfgはread-only共有可能だが、一時領域とcontainer名はrun identityで分離する。

## 拡張境界

- planner追加は`buildArgv`、`snapshotEnvironment`、`verifyEnvironment`の3契約を実装する。
- 水平スケール、queue、distributed schedulerは要求外。1 runnerあたり同時実行1、全体はGitHub job並列性を利用し、上限超過はqueueではなくrunner側待機とする。jar/image cacheはcontent-addressed read-onlyで共有し、検証後bytesのみ使用する。
