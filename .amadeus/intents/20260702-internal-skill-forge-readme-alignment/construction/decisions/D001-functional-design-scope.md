# D001 Functional Design の範囲

## 状態

accepted

## 判断

Functional Design は README 上の skill 役割整理と、Amadeus skill を確認するときの `skill-forge` 契約に限定する。

## 根拠

この Intent は README alignment を目的にしている。

そのため、skill 本文や validator の実装を変更すると、要求 R004 の互換性境界を超える。

## 影響

Construction の対象 Deployment Unit は README、README.ja.md、Amadeus 成果物、state.json に限定する。
