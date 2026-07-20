# Logical Components — goa-sparse-acceptance

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component inventory

| Component | 所有面 | 入力→出力 | Failure domain |
|---|---|---|---|
| GoA Head Scanner | core `amadeus-norm-metrics.ts` | text → ordered offsets + actual execCalls | 非単調offset・再走査上限違反をunit testで隔離 |
| GoA Record Extractor | core `amadeus-norm-metrics.ts` | text + scan result → ordered record strings | 構造終端誤り・抽出漏れ。parse成功と別カウンタで検出 |
| GoA Parser/Aggregator | core `amadeus-norm-metrics.ts` | record string → `GoaBreakdown` または `ParseFailure` | malformed segment 1件でrecord全体failure |
| E-code Occurrence Matcher | core `amadeus-norm-metrics.ts` | text → full-length E-code matches / count | match範囲だけを拡張し、occurrence数と`countMatches`集計を不変化 |
| Memory Rule Loader | core `amadeus-graph.ts`、非変更 | memory files → materialized `RuleFile[]` | 既存全件materialization。streaming保証なし |
| Election ID Validator | `scripts/amadeus-election-record.ts` | unknown → `GoaLineCode` parse result | lexical validationだけ。storeへ書かない |
| Election CLI Presenter | `scripts/amadeus-election.ts` | validator result → exit/error prose | `handleOpen`の期待形式文言だけ。内部store非変更 |
| Distribution Generator | package/promote scripts、非変更 | core正本 → dist 6面+self-install | drift guardがbyte不一致をloud failure |

## 境界と依存

`GoA Head Scanner → GoA Record Extractor → GoA Parser/Aggregator`は同一deep module内のpure pipelineとする。Scannerのoffset/execCallsはExtractorが実際に消費する証拠であり、別のtest-only実装を作らない。ParserはScannerの計測責務を持たず、record単位の文法・集約だけを所有する。E-code Occurrence Matcherは同じmoduleの既存count経路に留め、GoA parserと統合しない。旧/new regexのcount対照と複節全長matchを別assertにする。

Memory Rule Loaderは既存`RuleFile[]`を提供する上流境界であり、本intentから変更しない。E-code Occurrence Matcherはprose内の非anchored scan、Election ID Validatorは入力値全体のanchored validationを所有し、accepted languageを同一視しない。共有するのは大文字英数字の複節segment形だけであり、前者のvalid-prefix matchと後者のwhole-value拒否は意図的に異なる。CLI Presenterはcore parserからimportせず、e2のhold-resolution/rulingText変更領域へ交差しない。

## Blast radius

- Scanner/Extractor/Parser defect: norm metricsのGoA抽出・parse testへ限定し、render/store/timelineを変更しない。
- E-code Matcher defect: citation occurrence countと表示対象文字列へ限定される。旧/new regexの同一corpus count差をgateで止め、`countMatches`消費構造を変更しない。
- ID Validator defect: election openの入力受理だけに限定し、tally/verify/hold resolutionを変更しない。
- CLI prose defect: error説明だけで値検証はValidatorがfail-closedに維持する。
- Loader/corpus容量: 既存full materializationのまま。本intentは追加全層コピーを作らないが、loaderの容量特性自体は改善しない。
- Distribution drift: generator checkがmerge前に全配布面を停止する。

## 非該当infrastructure

新しいservice、process、network、database、queue、cache、AWS account/resource、credential、shared runtime stateはない。したがってservice isolation、AZ/region failure domain、load balancer、autoscaling group、backup replicaはN/Aである。論理分離は既存ファイル所有権とpure function境界で実現する。

## Test mapping

| Design invariant | Test layer |
|---|---|
| offsets厳密単調・`execCalls=H+1`・`N=1/2/4` | pure unit |
| sparse正負文法・固定8-bin・failure atomicity | pure unit |
| 旧/new `ECODE_RE` occurrence count不変・複節全長match・`countMatches`非退行 | pure unit + 実corpus integration |
| memory層head数=抽出数、parse分類全数 | 実FS integration |
| `GoaLineCode`複節/圧縮/負境界 | scripts unit |
| CLI error prose/exit | CLI integration |
| dist 6面+self-install byte同期 | existing drift checks |
