# Logical Components — U3 run-model-check

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Components

| Component | Responsibility |
|---|---|
| args/parser | parse-only CLI boundary |
| planner selector | Darwin/Docker選択 |
| spawn planner | snapshot、verify、argv、receipt |
| TLC toolchain | acquire、run、normalize |
| path/cache boundary | realpath包含・out分離・cache mkdirをfilesystem port経由のResultへ閉じる |
| artifact publisher | terminal manifestとatomic publish |
| terminal reporter | exit/stderr JSONとhuman lineの単一写像 |
| composition root | parse→load→path validate→reserve→execute→reportのみ |

## Failure domains

- 依存方向はcomposition root → args/source/path boundary → reserved execution → planner/toolchain → artifact publisher、およびcomposition root → terminal reporterとし、逆importを禁止する。
- plannerはEnvReceipt、toolchainは`{outcome, stdout, stderr, counterexample?}`、publisherは`PublishResult`を同期Resultで次段へ渡す。publisherだけがout/tempへwriteし、検証済みjar cacheはplannerがread-only所有する。
- 予約前のcanonicalization例外はpath boundaryがHARNESS_ERROR/exit 2へ写像する。artifact予約後はcache作成、toolchain factory/acquire、planner、prepare/run、publisherを単一execute/publish境界に入れ、例外を固定errorCodeへ閉じて可能な限りfailure directoryへterminal manifest-lastで公開する。publisher初回例外はfailure outcomeで一度だけ回復publishし、二重成功manifestを禁止する。
- 共有資源はcontent-addressed jar/image cacheだけで、workspace/out/temp/container名はrunIdで分離する。
