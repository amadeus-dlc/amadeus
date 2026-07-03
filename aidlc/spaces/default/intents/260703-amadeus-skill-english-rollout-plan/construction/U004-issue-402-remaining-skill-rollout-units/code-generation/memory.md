# Memory: code-generation

## Interpretations

- B004 は #402 の展開単位整理であり、残り skill の実際の英語化は含めない。
- #391、#393、#392、#394 の AI-DLC v2 difference PRs は、後続英語化の語彙と意味保存に影響するため、最優先の前提にする。
- Core entrypoints and verification は、stage skill が参照する語彙を先にそろえるため、stage family より前に扱う。
- Construction stage skills は、代表 skill `amadeus-construction-functional-design` の知見を直接再利用できるため、Inception と Ideation より前に扱う。
- `Construction Autonomy Mode: autonomous` のため、会話内 gate は提示せず、approval evidence は B004 PR merge 後に記録する。

## Deviations

- Functional Design、NFR Requirements、NFR Design、Infrastructure Design は skip した。
- #402 は展開単位と検証方法の整理であり、新しい業務ロジック、非機能要求、インフラ設計を追加しないためである。
- skill 本文は変更していないため、昇格フローは実行しない。

## Tradeoffs

- Core entrypoints and verification を先に置くことで、後続の phase skill が参照する語彙を安定させる。
- Construction stage skills を Inception と Ideation より先に置くことで、代表 skill の英語化で得た検証方法を早く再利用できる。
- 実際の英語化完了は #402 の完了条件から外した。#402 は PR 単位と順序の判断を完了証拠にするためである。

## Open questions

- RU002 で `amadeus` を単独 PR に分けるかどうかは、実際の差分量を見て判断する。
