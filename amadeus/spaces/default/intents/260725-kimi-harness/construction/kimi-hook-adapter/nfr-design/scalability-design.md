上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Scalability Design — kimi-hook-adapter

> 上流入力の使用箇所: scalability-requirements.md の基準(無状態・core 側ロックに依存)を設計の前提とする。

## 対象の概要

scalability-requirements.md のとおり、adapter は無状態でスケールの概念を持たない。

## 設計

- **無状態の保証**: adapter はプロセス間で状態を共有しない(ファイル・環境変数への書き込みを持たない)。並行起動は core hooks 側の既存ロック(mkdir ベース監査ロック)に委譲(scalability-requirements.md §判定と基準)
- **イベント量の規模増**: リニアコストのみで、バッファ・キュー・キャッシュを導入しない
