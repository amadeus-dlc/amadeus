# Functional Design Questions — U3 Guard Validation Plan

## 質問生成の判断

追加質問は生成しない。`unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` は U3 を validation contract の明文化として定義している。

## 実装前確認

Code Generation または Build and Test で、実際に実行する command set を差分量に応じて確定する。最低候補は `bun run dist:check` と `bun run promote:self:check` である。
