# Performance Test Instructions

Unit: no-stub-lint（Test Strategy: Minimal）

## 適用判断

不適用とする。

## 根拠

lint rule は CI で単発実行される全木走査で、既存 2 rule と同等の走査量（実測で数秒以内）。性能要求は requirements.md に存在しない。Testing Posture の規約に従い判断を記録する。
