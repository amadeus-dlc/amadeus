# D002 BC001 自己開発運用

## 状態

accepted

## 文脈

stage 判定、stage0 採用判断、build workspace と target workspace の対応記録は、Domain Map の BC001 自己開発運用で採用済みである。

Issue #278 は、phase skill 起動時の skill 供給元と実行環境の stage 前提を扱う。

## 判断

この Intent の Unit は、Bounded Context として BC001 自己開発運用を参照する。

新しい Bounded Context は採用しない。

## 影響

`state.json.inception.gate` は、Domain Map の adopted Bounded Context を参照できるため `passed` にできる。

Context Map には新しい依存を追加しない。
