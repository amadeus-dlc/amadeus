# D002: BC001 自己開発運用

## 背景

Domain Map には、BC001 自己開発運用が adopted Bounded Context として登録されている。

この Intent は、Amadeus 本体の README、skill source、昇格先成果物、検証入口を扱う自己開発作業である。

## 判断

Unit の `コンテキスト` は BC001 自己開発運用を参照する。

新しい Bounded Context は採用しない。

## 理由

README と skill の整合確認は、Amadeus 本体の自己開発 cycle、stage 判定、workspace 対応記録に属する。

既存の BC001 で対象境界を説明できるため、新しい Bounded Context を作る必要はない。

## 影響

`state.json.inception.gate` は、Unit が Domain Map の adopted Bounded Context を参照しているため `passed` にできる。

Construction で詳細な Domain Model や契約が必要になった場合は、Functional Design へ引き継ぐ。
