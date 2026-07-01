# D002: BC001 自己開発運用採用

## 背景

- `.amadeus/domain-map.md` は、BC001 自己開発運用を `adopted` として定義している。
- この Intent は、Amadeus 本体の自己開発中に見つかった skill 実行上の問題報告を扱う。
- 新しい境界づけられたコンテキストを採用する根拠は、Issue #248 と Ideation 成果物にはない。

## 判断

- Unit のコンテキストとして BC001 自己開発運用を採用する。
- 新しい Bounded Context は作らない。
- Domain Map と Context Map は更新しない。

## 理由

- 問題報告標準化は、自己開発 cycle の stage 判定、workspace 対応記録、skill 改善判断と同じ運用境界に属する。
- 既存の BC001 は adopted であり、Inception gate を通すための参照先として使える。
- 新しい Bounded Context を作ると、報告契約の整理よりも境界管理が大きくなり、Issue #248 の目的から外れる。

## 影響

- `units.md` の `コンテキスト` は BC001 を参照する。
- `traceability.md` は SD001 と BC001 を Domain Map の定義元として参照する。
- Construction Functional Design で新しい共有境界を採用する必要が出た場合だけ、後続判断として Domain Map を更新する。
