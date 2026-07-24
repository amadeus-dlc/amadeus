# Scalability Design — U2 plugin-skeleton

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Index

- compile invocation内のMapでcore/plugin slugを一意化し、path順walkに対してO(files+bytes)で処理する。
- 1,000 stageまたは10秒超まで永続indexを導入しない。

## Concurrency

- compose/drop/compileは既存workspace lockで直列化し、途中世代のplugin treeを読まない。
- 複数pluginは独立directoryとdigestを持ち、一つのdropが他pluginへ波及しない。
