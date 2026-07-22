# Scalability Requirements — goa-sparse-acceptance

上流入力(consumes 全数): `business-logic-model.md` の file/record/segment 処理単位、`business-rules.md` の BR-3/BR-5/BR-10、`requirements.md` の corpus 実行時再測定と FR-4、brownfield 条件の `technology-stack.md` にある Bun test runner を実依拠として使用する。memory 層は `packages/framework/core/tools/amadeus-graph.ts:512-517,543-554,570-596` の `loadRules()` が `RuleFile[]` へ全件 materialize し、`amadeus-norm-metrics.ts:235-242,501-505,821-843` が同期走査する現行境界を根拠とする。

## スケール次元

service instance、同時接続、RPS は N/A である。成長する次元は、memory ファイル数 `F`、1ファイルの入力バイト `B`、GoA occurrence 数 `H`、sparse segment 数 `S`、vote token 数 `T` とする。corpus は persist のたびに増えるため、固定件数を capacity 上限や成功条件にしない。

## 要件

| ID | 要件 | 合格条件 | 根拠 |
|---|---|---|---|
| SC-1 | memory 層の容量は既存 `loadRules()` による全 `F` ファイル・総入力量 `B_total` の materialization を基準とし、本変更で streaming 化を主張しない。parser/extractor は呼出し元から渡された1文字列を処理し、全層を再連結した追加コピーを作らない | `amadeus-graph.ts:512-517,543-554,570-596` の非変更、文字列 fixture test、changed-code review で既存境界の非増幅を確認する | FR-4、brownfield 実コード |
| SC-2 | 1ファイル内の `H` occurrence を物理行数に依存せず全て抽出する | 同一行に複数 head を持つ record block を `N=1/2/4` へ拡張し、head 数=`extractGoaRecords().length` と `N` 比例を機械 assertする | E-GSFNR1 A、BR-5 |
| SC-3 | sparse 集約は `S` segment × 固定8 bin の領域に限定し、label 数や bin count に比例する全組合せ構造を作らない | `N=1/2/4` の生成 fixture で segment/token 件数の比例と各 vector/集約 vector の8要素不変を機械 assertし、実装 review で cross-product 不在を確認する | E-GSFNR1 A、BR-3 |
| SC-4 | corpus 増加後も検証母数を source から毎回 discover し、21等の過去値を hard-code しない | integration test が runtime grep/discovery の head 数と抽出数を照合 | requirements.md FR-1 |

## Capacity と劣化方針

外部 SLA や予算上限がないため、6か月/12か月の利用者数予測は N/A とする。入力が増えた場合も silent sampling、先頭N件打切り、成功 record だけの部分返却へ劣化してはならない。処理不能な入力は全件検証の失敗として loud に返し、スケール対策を理由に correctness を弱めない。

## 検証引き渡し

- 合成 fixture: 同一行複数 head、複数 segment、欠落 bin、大きい非負 count を含め、件数と固定長 shape を assertする。
- 実 corpus: `F/H` を実行時に記録し、抽出 `H/H`、各 record の成功または意図的拒否分類を記録する。
- performance benchmark tool や外部 load generator は追加しない。回帰が見つかった場合のみ実測入力から別 Issue で閾値を設計する。
