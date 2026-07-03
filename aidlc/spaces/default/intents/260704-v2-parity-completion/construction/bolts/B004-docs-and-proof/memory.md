# Memory: build-and-test（B004）

## Interpretations

- B004 の 3.6 はエンジン駆動（dogfooding）で実行したため、実体の記録は v2 規定位置（construction/build-and-test/）にあり、この bolt ディレクトリは旧契約の validator 要求を満たす参照記録である。

## Deviations

- なし。

## Tradeoffs

- 参照方式の二重配置は移行期のみ。次の Intent からはエンジンの stage 単位配置に一本化される。

## Open questions

- なし。
