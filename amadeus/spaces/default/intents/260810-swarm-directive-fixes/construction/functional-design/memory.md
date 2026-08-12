# Functional Design Memory

## Interpretations

- 2026-08-10T14:36:00Z — UIなしのlibrary Unitなのでfrontend-componentsは非適用。
- 2026-08-10T14:42:00Z — U2もUIなしのlibrary Unitなのでfrontend-componentsは非適用。

## Deviations

- なし。
- 2026-08-10T15:20:00Z — ConstructionでRetry後のprepared batch再dispatch seam欠落を検出し、ユーザー裁定「1」により既存invoke-swarmのoptional相関とsolo BOLT相関を追加する設計改訂を承認。新kind/stateは追加しない。

## Tradeoffs

- 2026-08-10T14:36:00Z — audit projectionとselector配線を同一Issue vertical Unitへ統合し、1 Issue=1 Unit=1 PRを維持する。
- 2026-08-10T14:42:00Z — fan-outの対象判定とdisk presence分類を分離し、outcome不確定を欠落pathへ誤変換しないfail-closed設計を採用する。

## Open questions

- なし。
