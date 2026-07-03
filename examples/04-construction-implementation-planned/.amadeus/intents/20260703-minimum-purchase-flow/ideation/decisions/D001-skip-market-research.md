# D001：Market Research を実行しない

## 背景

Stage 1.2 Market Research は、外部市場での位置づけ、または build-vs-buy の判断がある場合だけ実行する。

## 判断

Market Research を実行せず、`stages["market-research"]` を `skipped` にする。

## 理由

EC サイト最小購入フローは社内の自社サイト向け開発であり、外部市場での位置づけや build-vs-buy の判断がないと人間の指示で確定した。

## 影響

competitive-analysis、market-trends、build-vs-buy の成果物は作らない。
Initiative Brief は市場の項を持たない。
