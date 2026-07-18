# RAID Log — test-pyramid-rebuild(#684)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`

## Risks

| # | リスク | 影響 | 緩和 |
|---|---|---|---|
| R-1 | fan-out 分類の判定ブレ(agent 間で分類基準が食い違う) | 台帳の信頼性低下 | classifyTestSize の決定的 rubric を1本化して配る+構造化出力回収(leader 指針)。境界ケースのみ high effort 再判定 |
| R-2 | 比率目標を実測なしのマジックナンバーで決める | 検証劇場 | 実測 tier×size を前提に選挙で導出、named constant 化 |
| R-3 | 移設スコープの肥大(本 intent で書き換えまでやる) | グリーン退行リスク・単一 Bolt 肥大 | 実移設は Issue 分割の別 intent、本 intent は計画まで(C-2/C-6) |
| R-4 | 並列 fan-out 後のフルスイート統合検証が負荷でフレーク | 偽赤 | fanout-load-settle-before-integration(負荷収束待ち) |

## Assumptions

- A-1: classifyTestSize の rubric が現行世代の正(format-currency-grep-for-parser-intents — RE で現行実装を実測)
- A-2: test_pyramid コレクタの tier=ディレクトリ層の前提が維持される

## Issues

- I-1: なし(前提課題なし — 本 intent 自体が #684)

## Dependencies

- D-1: classifyTestSize / test_pyramid コレクタ / size ドリフトゲート(既存実在)
- D-2: #683(Codecov ゲート — 層別カバレッジ整合の計画対象)
