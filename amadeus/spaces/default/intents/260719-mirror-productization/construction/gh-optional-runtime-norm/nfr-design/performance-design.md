# Performance Design — gh-optional-runtime-norm

> 入力: performance/security/scalability/reliability requirements、tech-stack decisions、business logic model

## Design

CID一件を直接検査し、全文正規化比較と`git diff --check`を独立checkとして実行する。runtime componentは追加しない。

## Validation

対象scanはproject norm一ファイル、application benchmark regressionは0件。
