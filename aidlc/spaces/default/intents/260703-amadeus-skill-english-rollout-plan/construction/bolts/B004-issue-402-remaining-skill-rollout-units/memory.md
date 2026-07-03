# Memory: build-and-test

## Interpretations

- B004 の Build and Test は、展開計画文書と Amadeus DLC 成果物構造を検証する。
- skill 本文を変更していないため、昇格フローは不要である。
- `test:examples` の stale 許容ログは既存の許容事項であり、今回の変更による failure ではない。

## Deviations

- 残り skill の実際の英語化は実行していない。
- #391、#392、#393、#394 の Issue body は直接編集していない。

## Tradeoffs

- Construction stage skills を Inception と Ideation より先に置いた。
- 代表 skill の英語化で得た検証方法を、同じ phase の stage skill へ早く適用できるためである。

## Open questions

- RU002 で `amadeus` を単独 PR に分けるかどうかは、実際の差分量を見て判断する。
