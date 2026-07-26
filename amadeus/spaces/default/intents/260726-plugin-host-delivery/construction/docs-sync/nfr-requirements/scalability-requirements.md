# スケーラビリティ要件 — U8 docs-sync

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 適用範囲

U8 は `docs/guide/19-plugins.md` / `19-plugins.ja.md` の日英ペアを更新する文書 Unit である(`business-rules.md` BR-U8-0、`requirements.md` FR-9)。`business-logic-model.md` のとおりコード経路・実行時リソースを追加せず、`technology-stack.md` 実測どおり常駐 service も持たない。負荷・並行・データ量に対してスケールするランタイム要素が存在しないため、スケーラビリティ要件は該当しない。

## SCALE-U8-1: スケーラビリティ = N/A(文書 Unit)

- N/A の根拠: U8 は 2 ファイル(日英ペア)の Markdown 更新に閉じ、利用者数・データ量・並行アクセスに応じて拡張する処理を持たない(`business-rules.md` BR-U8-0「C1-C7 の実装物・record には触れない」、`business-logic-model.md`「コード変更なしの Unit」)。`technology-stack.md`「HTTP・DB はない」実測どおり、水平スケーリング・負荷分散・キャッシュの service パターンを機械適用しない
- 文書の分量は対象語彙(`business-rules.md` BR-U8-2 の repo 全域 grep で導出)の更新対象数に比例するが、これは静的な文書量であってランタイムのスケーリング軸ではない

## 更新対象の有界性

`business-rules.md` BR-U8-2(語彙起点の棚卸し)のとおり、更新対象は対象語彙(plugin / compose / doctor / drop / marketplace / --single)の repo 全域 grep から有界に導出される。無制限に増える対象ではなく、grep 結果として確定する有限集合である。

- 合否: 更新対象 docs が対象語彙の grep 結果として有界に確定する(`business-rules.md` BR-U8-2 検証 — grep コマンドと結果の転記)。docs/ 起点の列挙でなく語彙起点で正本知識ファイルの見逃しを防ぐ
