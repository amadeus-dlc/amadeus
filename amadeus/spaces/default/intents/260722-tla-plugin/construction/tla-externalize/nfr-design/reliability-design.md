# Reliability Design — U1 tla-externalize

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 障害分類

- `ModelLoadError`は`{ code, relativePath, cause? }`を持つ同期Resultのerror側とし、codeを`MODEL_MISSING`、`CFG_MISSING`、`MODEL_EMPTY`、`CFG_EMPTY`、`MODEL_UNREADABLE`、`CFG_UNREADABLE`、`MODEL_MAP_MISSING`、`MODEL_MAP_EMPTY`、`MODEL_MAP_UNREADABLE`、`MODEL_MAP_INVALID`へ分類する。`cause`は内部診断専用で外部receiptへ出さない。
- locator/loader/parserが`ModelLoadError`を生成し、U1 adapterが全codeを既存outcome `HARNESS_ERROR`、process exit 2へ1:1で写像する。`SOURCE_DRIFT`はloader errorではなくverifierの既存toolchain abort型として維持し、同じ`HARNESS_ERROR`/exit 2へ写像する。
- locator→loader→parser→verifierのpipelineが`Result<VerifiedTlaSource, ModelLoadError | SourceDriftError>`を返す。Resultはこのpipelineの戻り値であり、generatorやreceipt関数の引数にはしない。
- adapterはpipelineを呼び出してResultを内部で網羅分岐する。success側では`VerifiedTlaSource`だけを既存generator/receiptへ渡し、failure側ではerrorだけをHARNESS_ERROR mapperへ渡す。adapter以外の層はprocess exitを決めない。
- 部分的に読めた場合も成功値を返さず、`generateFrozenTlaModel`と`createFrozenTlaModelReceipt`を呼び出さない。
- retry、circuit breaker、graceful degradationは非決定的な結果や壊れた入力の隠蔽になるため採用しない。

## 回復と互換性

- 回復手段はGit管理された正しいファイルへの修正または履歴からの復元後、全identity検証を再実行することである。
- 旧埋め込み定数は削除し、二重ソースによるfailoverを禁止する。
- 公開関数シグネチャを維持し、同一入力のverdictが時刻・実行順序に依存しないことをunit/integration testで固定する。
- backup、replication、health endpointは永続状態・常駐serviceがないため非該当である。
