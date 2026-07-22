# Performance Requirements — goa-sparse-acceptance

上流入力(consumes 全数): `business-logic-model.md` の occurrence→parse フローと固定長8-bin変換、`business-rules.md` の BR-1〜BR-8/BR-10、`requirements.md` の FR-1/FR-3/FR-4、brownfield 条件の `technology-stack.md` に記録された Bun/TypeScript を実依拠として使用する。memory 層の現行読込境界は `packages/framework/core/tools/amadeus-graph.ts:512-517,543-554,570-596` の `loadRules()` による `RuleFile[]` 全件 materialization と、`amadeus-norm-metrics.ts:235-242,501-505,821-843` の同期走査である。

## 適用境界

本 Unit はローカル CLI 内の同期・in-process parser/extractor であり、ネットワーク、常駐 service、共有 database、同時利用者を追加しない。したがって response-time percentile、RPS、service SLO は N/A とする。固定ミリ秒閾値は実行環境差から新しいマジックナンバーになるため置かず、処理量に対する構造上限と回帰証拠を性能契約とする。

## 要件

| ID | 要件 | 測定・合格条件 | 根拠 |
|---|---|---|---|
| P-1 | `extractGoaRecords` は入力テキスト長を `B`、head occurrence 数を `H` としたとき、one forward cursor で bounded-pass し、full-input rescan と同一開始位置の再探索をしない | 同一 record block を `N=1/2/4` 回連結した生成 fixture で入力 `B` と head/返却件数 `H` が `N` に比例することを機械 assertする。NFR-design で cursor 単調前進または scan invocation 上限を観測する決定論的 seam/検査へ落とし、導出した走査回数上限も assertする | E-GSFNR1 A、FR-1、BR-5 |
| P-2 | sparse parse は token 数 `T`、segment 数 `S` に対し順次処理し、各 segment の vote vector は常に8要素 | 同一 sparse segment 群を `N=1/2/4` 件へ展開した生成 fixture で record/segment/token 件数が `N` に比例し、各 `votes.length=8` と集約 `votes.length=8` が不変であることを機械 assertする。label/bin の全組合せ表を事前生成しない | E-GSFNR1 A、business-logic-model、BR-2/BR-3 |
| P-3 | memory 層は既存 `loadRules()` が `RuleFile[]` へ全件 materialize する境界を維持し、本変更で file-at-a-time streaming を新規保証しない。parser/extractor は渡された1文字列を処理し、全 memory body を再連結した第2の全文コピーを作らない | `amadeus-graph.ts:512-517,543-554,570-596` を非変更とし、`extractGoaRecords(text)` の文字列 fixture test と changed-code review で追加の全層連結・FS読込がないことを確認 | FR-4、brownfield 実コード |
| P-4 | E-code 全長 match 化は occurrence 数を増減させない | 同一 corpus に旧/新 regex を適用し match count が等しいこと、複節 ID が1 match のまま全長化することを別 assert | FR-3、BR-10 |

## 検証引き渡し

- unit: 文字列 fixture で canonical/sparse、`H`、`S`、`T`、固定長8-bin を決定論的に検証する。
- linearity regression: `N=1/2/4` の生成 fixture で shape/count scaling と走査回数上限を機械 assertする。wall-clock は診断証拠として記録してよいが、環境依存の合否 gate にしない。
- integration: 現行 `loadRules()` の全件 materialization 境界から memory 層を発見し、各文字列の実行時 head occurrence 数と抽出数を照合する。corpus 件数を21へ固定せず、file-at-a-time streaming を実装済みと表現しない。
- code-generation/build-and-test: 変更行 lcov 100%、typecheck/lint/対象 test/全 CI green を性能回帰の必要証拠とする。ただし coverage green を計算量の証明とはみなさず、P-1〜P-3 の構造レビューを併用する。

E-GSFNR1 留保(verbatim): 「NFR-designでcursor単調前進またはscan invocation上限の決定論的seam/検査へ落とし、走査回数上限もassertすること。」
