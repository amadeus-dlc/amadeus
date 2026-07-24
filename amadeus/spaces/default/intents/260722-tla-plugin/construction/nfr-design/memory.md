# NFR Design Memory

## Interpretations

- 2026-07-24T00:00:00Z — CLI/libraryユニットでは常駐サービス向けのキャッシュ、水平スケール、circuit breakerを導入せず、決定的なファイル境界とfail-closed設計へ置き換える。

## Deviations

- なし。

## Tradeoffs

- 2026-07-24T00:00:00Z — 埋め込みfallbackよりGit履歴からの復元を選び、可用性より単一ソースとdrift検出を優先する。

## Open questions

- なし。
