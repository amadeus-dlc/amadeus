# Memory: build-and-test（B002）

## Interpretations

- 5 件の検証 fail はすべて「削除と置換への検証コードの追随」であり、想定外の退行ではないため halt-and-ask にしなかった。

## Deviations

- なし。

## Tradeoffs

- amadeus-templates eval の amadeus entry は、新入口の安定文字列（forwarding loop、engine-bridge 参照）での検査に置き換えた。旧 entry が検査していたモジュールファイルテンプレートは GD009 で廃止確定済みのため、検査対象から外れることは仕様である。

## Open questions

- なし（B002 固有分は code-generation/memory.md を参照）。
