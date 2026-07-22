# Scalability Design — goa-sparse-acceptance

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 成長軸と現行境界

成長軸はmemory file数`F`、総入力量`B_total`、1入力文字列のbyte数`B`、head数`H`、segment数`S`、token数`T`である。service instance、同時接続、RPSは存在しない。

memory層は`amadeus-graph.ts`の既存`loadRules()`がorg/team/project/phasesを`RuleFile[]`へ全件materializeし、`amadeus-norm-metrics.ts`が`flattenRules`後に同期走査する。このintentはgraph loaderを変更せず、streaming保証を新設しない。新scanner/parserは渡された1文字列を処理し、全memory bodyを結合した追加の巨大文字列を作らない。

## Scaling設計

- head発見は`scanGoaHeads`の単一forward loopに限定し、`H`件に対する実`execCalls`を`H+1`に固定する。
- record境界は同じoffset列の隣接要素と構造終端から導出し、recordごとに全文先頭から検索し直さない。
- sparse parseは各segmentを入力順に1回処理し、segmentごとに固定長8-bin vectorを1個だけ作る。label×binのcross-product tableは作らない。
- corpus件数21等をcapacity定数にしない。integration testが実行時にmemory層のhead数を発見し、抽出`H/H`とparse分類を記録する。

## Capacity検証

`N=1/2/4`生成fixtureに対し、入力・head・record・segment・token件数の比例、offset厳密単調、`execCalls=H+1`、各vector長8をassertする。実corpusでは`F/H`をcommand出力から記録し、固定母数を成果物へ転記しない。

入力増加時もsilent sampling、先頭N件打切り、malformed token破棄、成功recordだけの部分返却へ劣化しない。処理不能入力は全件検証失敗としてloudに返す。auto-scaling、load balancer、partition、queue、cache、AWS resourceは非該当である。

## 将来境界

memory層自体のstreaming化や`loadRules()`の容量改善が必要になった場合は別Issueとし、graph rule resolution・deterministic ordering・全harness配布へのblast radiusを再設計する。本intentのparser最適化へ同乗させない。
