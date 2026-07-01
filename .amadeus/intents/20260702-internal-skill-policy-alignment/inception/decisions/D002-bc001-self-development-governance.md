# D002: BC001 自己開発運用参照

## 背景

Domain Map には、BC001 自己開発運用が adopted Bounded Context として登録されている。

この Intent は、Amadeus 本体の skill、README、設定、PR 準備を自己開発の成果物として扱う。

## 判断

Unit U001 のコンテキストとして BC001 自己開発運用を参照する。

## 理由

この Intent は、stage 判定、workspace 対応記録、target artifacts、検証結果を自己開発運用の範囲で扱う。

新しい Bounded Context を採用する必要はない。

## 影響

Inception gate は、Domain Map の adopted Bounded Context を参照して `passed` にできる。

Domain Map と Context Map は更新しない。
