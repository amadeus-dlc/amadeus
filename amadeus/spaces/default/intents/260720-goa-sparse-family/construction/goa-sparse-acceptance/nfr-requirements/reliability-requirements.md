# Reliability Requirements — goa-sparse-acceptance

上流入力(consumes 全数): `business-logic-model.md` の不変条件・検証シナリオ、`business-rules.md` の BR-1/BR-4/BR-8〜BR-12、`requirements.md` の FR-1〜FR-4、brownfield 条件の `technology-stack.md` にある Bun test/CI/dist 生成経路を実依拠として使用する。

## Reliability 境界

常駐 service、database、backup 対象を新設しないため、availability SLO、SLA、RTO、RPO、failover、runtime metrics/tracing は N/A である。本 Unit の reliability は、同じ入力が同じ結果を返す決定論、failure atomicity、後方互換、正本と配布物の同一性として定義する。

## 要件

| ID | 要件 | 検証 | 根拠 |
|---|---|---|---|
| R-1 | canonical 8-bin 入力は既存 `votes` と error 契約を維持し、`segments` を付けない | 現行 canonical 正負 fixture の回帰 test | BR-1 |
| R-2 | sparse record は全 segment 成功時だけ値を返し、失敗時に部分値・前回値を残さない | 混在 fixture と4 error class test。parser が外部 state を変更しないことを in-process で確認 | BR-4/BR-8 |
| R-3 | 同じ入力文字列・同じ corpus snapshot は実行順に依存せず同じ抽出/parse 結果になる | unit test の反復実行と、integration sweep の head/record 対応表 | business-logic-model |
| R-4 | 旧圧縮 E-code と新複節 E-code をともに受理し、`renderGoaLine`、store/timeline、hold-resolution 面を変更しない | t238 圧縮 pin 温存、複節正例追加、non-touch path diff | FR-2、BR-9/BR-11 |
| R-5 | core 正本変更は生成器で dist 6面+self-install へ同期し、手編集差分を残さない | `dist:check`、`promote:self:check`、byte comparison | FR-4、BR-12 |
| R-6 | falling proof は fix commit 後に test が読む面だけを pre-fix へ切替え、失敗を確認後に fix SHA で復元する | pre-fix/fix SHA、失敗数、復元 byte identity、最終 green を code summary へ記録 | requirements.md FR-4 |

## Graceful degradation と障害分類

不正入力は回復可能なデータ error であり、型付き `ParseFailure` と stable prefix で呼び出し元へ返す。parser defect、抽出漏れ、dist drift は回復不能な実装 failure として test/CI を loud に失敗させる。成功 record だけ返す、malformed token を捨てる、旧形式へ黙って fallback する動作は graceful degradation ではなく correctness 破壊のため禁止する。

## Observability と証跡

新しい runtime logging/telemetry は追加しない。必要な観測面は、unit/integration test 結果、corpus sweep の発見数/抽出数/分類、lcov の変更行、dist/self-install drift guard、PR diff とする。これらは build-and-test の成果物へ実測値として記録し、未実行を PASS と表現しない。
