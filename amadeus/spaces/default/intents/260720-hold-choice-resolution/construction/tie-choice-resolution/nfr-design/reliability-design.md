# Reliability Design — U1 tie-choice-resolution

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md — R 要求の実装位置は business-logic-model.md の DURABLE append 順(無変更ブロック)に固定し、回帰保証(R-2/R-3)はテスト設計として tech-stack-decisions.md のテスト層区分(NFR-2)へ落とす。security-design S-2 と R-1 は同一コードブロックの両面。

## 設計

| NFR | 実装形 |
| --- | --- |
| R-1 | tie 分岐は resumedTo 決定のみを変更し、DURABLE append(:211-221)〜状態遷移の順序ブロックへ手を入れない — 順序退行はコード上不可能(変更行が append より前に閉じる) |
| R-2 | 既存ピン(t236:310 系)は無変更 green を CI で機械確認。既存受理値の不変は非 tie 経路の字句移設のみ(検証条件・文言不変)が構造保証 |
| R-3 | store sweep(load/verify 全数)を build-and-test の検証手順に含める — 対象は実装時点の worktree glob 全数(実測 ref は NFR-3 様式で記録) |
| R-4 | 誤入力 = 回復可能(exit 1+valid ヒント → 再実行)。store 破損・load 失敗 = 既存 fail-fast のまま(エラー分類の区分変更なし) |

## テスト設計(NFR-2 層区分)

- unit: parseChoiceResolution(正常形・choice: 欠落・非数値・先頭ゼロ・空 — performance-design P-1 の regex 境界)
- integration: tie hold-resolved 閉包(受理→tally.json 保存順→resumedTo)・loud 拒否(exit 1+文言)・render 貫通・store sweep(実 FS — fs-tests-integration-first)
