# Memory — u6-impl-only-path functional-design

## Interpretations
- 2026-07-31T13:14:13Z — FR-D1 の「監査行」の実現形を FD で確定: intent 非依存ツールの独立性を守り stdout 構造化結果+git コミット面の2層とする(amadeus 監査シャード非依存 — reviewer M1 実測の帰結。#1510 暫定運用『手編集+PR 本文明記』の正規化)
- 2026-07-31T13:14:13Z — impl drift 判定は check 経路の evaluateEntries+diffModelMap を update 経路へ再配線(第3の drift 実装を作らない — reviewer M2 の帰結)

## Deviations

## Tradeoffs

## Open questions
