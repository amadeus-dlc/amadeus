# Scalability Requirements — experiment-contract-provenance

## Capacity boundary

`business-logic-model.md` のfinite state fold、`business-rules.md` のclosed constants、`requirements.md` の2 arm / fixed benchmark profile、`technology-stack.md` のsingle-process Bun CLIに従う。本実験はhorizontal serviceではなく、voters=3、choices=3、2 arms、D-COUNT=7または根拠ある5のclosed capacityである。

## Scaling requirements

- U1は1 active experiment ledgerをserialにfoldし、成功経路最大6 events、command / event payload各1 MiBを上限とする。同一ledgerへのparallel writerやdistributed consensusを要求しない。
- input bytesとevent数に対してparse / fold / validationを線形に保つ。voter / choice / arm cardinalityをruntime auto-scaleしない。
- handler registryはclosed command kind数とexact equalityを要求し、plugin discoveryやfilesystem scanで増殖させない。
- evidence本体はU3 storeが所有し、U1はcontent referenceだけを保持する。ledger replayに二次コピーを作らない。

## Growth and trigger policy

voter、choice、arm、fixture count、benchmark runsのいずれかを増やす要求はconfig tuningではなく新しいcontract decisionとする。現値を超える入力はfail-closedに拒否し、自動samplingやsilent truncationを行わない。

将来の拡張候補は、別intentで新cardinality、state-space bound、timeout、evidence storage capacityを同時に裁定し、既存identity versionから明示migrationする場合だけ許す。現intentではhorizontal scaling、queue、database、remote workerを追加しない。

## Verification

境界値testsはD-COUNT 7 / 5、closed command set、event数`0/1/3/6`、payload bytes`1 KiB/64 KiB/1 MiB`のacceptと、7 events / 1 MiB+1 byte / unknown valueのrejectを検証する。線形性はperformance要件のfold / byte-scan / node-visit counter上限で確認し、silent truncation、auto-cardinality、上限外cacheを0件とする。
