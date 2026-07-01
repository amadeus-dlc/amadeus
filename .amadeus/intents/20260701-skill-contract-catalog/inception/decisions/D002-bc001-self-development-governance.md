# D002: BC001 自己開発運用を参照する

## 背景

この Intent は、Amadeus 本体の skill 実行契約、validator、evaluator、decision review、learning review の参照契約を扱う。

Domain Map には、`BC001 自己開発運用` が adopted として登録されている。

## 判断

Unit の `コンテキスト` は `BC001` を参照する。

新規 Bounded Context は採用しない。
Domain Map と Context Map は、この Inception では更新しない。

## 理由

Skill Contract は Amadeus 本体の自己開発 cycle、stage 判定、skill 運用、validator/evaluator 連携に関わる。
これは既存の `BC001 自己開発運用` の責務と一致する。

## 影響

`inception.gate` は、Domain Map の adopted Bounded Context を参照しているため `passed` にできる。

Construction で新しい domain 境界が必要だと分かった場合は、現在 Intent に混ぜず、後続 Issue または後続 Intent 候補として扱う。
