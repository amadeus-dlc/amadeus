# R002: Intent 候補を提示できる

## 要求

- Amadeus 利用者が Discovery Brief を読んだとき、Intent 候補と候補判断を確認できる。
- `multi_intent` の場合に、最初に Intent 化する候補が1件に絞られている。
- Intent 候補には、後続候補との依存順序と除外範囲が含まれる。

## 受け入れ条件

- Intent 候補が記録されている。
- 候補判断が記録されている。
- 最初に Intent 化する候補が1件だけ示されている。
- 候補の依存順序が確認できる。
- Intent 初期化の自動実行を含まない。

## 根拠

- [20260628-discovery-brief-creation.md](../../20260628-discovery-brief-creation.md) の成功条件で、Intent 候補、候補判断、最初に Intent 化する候補が求められている。
- [scope.md](../scope.md) の Inception への引き継ぎで、Intent 候補提示が要求候補とされている。
- [mocks/initial-confirmation.puml](../mocks/initial-confirmation.puml) は、Intent 候補と最初に進める候補を確認する例を示している。

## 未確認事項

- Intent 初期化をどの操作で開始するかは、この Intent では固定しない。
