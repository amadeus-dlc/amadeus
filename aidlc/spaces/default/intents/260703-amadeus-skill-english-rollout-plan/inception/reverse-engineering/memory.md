# Memory: reverse-engineering

## Interpretations

- Amadeus 本体は brownfield であり、既存 `codekb/amadeus/` を鮮度維持のため更新した。
- 旧 `.amadeus/`、`state.json` 前提の記述は、現在の `aidlc/spaces/`、`aidlc-state.md`、`intents.json` 前提へ更新した。
- Issue #399 では、Amadeus skill 英語化計画に必要な構造理解として、skill、validator、examples、GitHub PR 運用を重視した。

## Deviations

- 対象コードは変更していない。
- 要求、Unit、Bolt、実装は作成していない。

## Tradeoffs

- Reverse Engineering はリポジトリ全体の詳細な関数一覧ではなく、後続 Inception が使う構造、入口、依存、リスクに絞った。
- Issue #399 に直接関係する GitHub Issue と PR の依存も codekb に記録した。

## Open questions

- 未確認事項はない。
