# Scalability Design — U1-mirror-tool

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SCD-U1-1: 単一 intent スコープの固定(SC-U1-1/SC-U1-2)

status の対象解決は既存 activeIntent(explicitIntentDir)に委譲 — 対象列挙・走査ループを持たない。将来の一括診断は本設計の関数(runStatus 純関数)を intent 引数で反復すれば足りる形(構造は開いているが本 unit では実装しない — YAGNI)。

## SCD-U1-2: 走査規模の上限(明示)

status 1回の I/O 上限 = ローカル read 2(intents.json+state)+gh view 1。反復・再帰・ページングなし — 規模はこの固定上限で閉じる。並列化・ワーカー機構は導入しない(SC-U1-3 のランタイム前提 = Bun 単一プロセス・同期実行に一致)。
