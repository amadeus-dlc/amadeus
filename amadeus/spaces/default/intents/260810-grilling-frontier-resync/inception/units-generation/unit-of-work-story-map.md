# Unit Story Map — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: units-generation (2.7)

上流入力(consumes 全数): `requirements.md`(Intent analysis の利用者ゴール — 本マップの背骨)、`components.md`(Unit を構成する改訂単位)、`services.md`(利用者接点 = Grill me モード選択と standalone スキル起動)、`component-methods.md`(検査面の利用者可視効果 = gate 報告の finding)、`component-dependency.md`(価値の流れる順序)、`decisions.md`(ADR-2 マーカーが利用者の質問票に現れる形)。

## 背骨(利用者活動)

```text
設計議論を始める → 論点ツリーを深掘りする → 被覆完了を確認する → 記録が契約に守られている
   (モード選択/         (frontier ラウンド、       (合意サマリ+           (センサー検査、
    スキル起動)          枝刈り、遮断器)            刈りノード列挙)          docs の一貫性)
```

## 価値スライスと Unit の対応

| 利用者価値 | 実現 Unit | 出荷時に使える体験 |
|---|---|---|
| スライス1: 「上限で打ち切られない深掘りが使える」 | U1 `protocol-core` | Grill me / `/amadeus-grilling`(Free 既定)が frontier 駆動で全分岐完走まで走る。選択画面・スキル・protocol の説明が一貫 |
| スライス2: 「超過と刈りが機械に守られている」 | U2 `budget-sensor` | workflow grilling の質問票が justification 検査で守られ、契約テストが文言 drift を CI で止める |
| スライス3: 「どのドキュメントを読んでも同じ仕様」 | U3 `projection-sweep` | guide/reference(en/ja)・conductor の説明が新仕様に一致し、配布面が再生成検証済み |
| (Unit 外)スライス4: 「実利用シナリオでの実証」 | FR-DOG-1(B&T 段) | Rust ナレッジ議論10領域の dogfood 完走記録 |

## 順序の根拠

スライス1が walking skeleton の対象(self-feature 必須 — 最初の Bolt で最小 end-to-end をゲート)。スライス2/3 は U1 の文言確定後に並行可能。詳細な Bolt 編成・ゲート計画は delivery-planning で確定する。
