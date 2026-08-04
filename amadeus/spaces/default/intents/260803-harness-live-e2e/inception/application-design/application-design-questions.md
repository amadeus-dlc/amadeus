# Application Design Questions — ハーネス横断 live E2E

参照入力: `requirements`、`architecture`、`component-inventory`、`team-practices`。

> **E-OC1 判定証跡**: Q1はcapability matrixとlive実行台帳の正本構造という実装・drift検証契約であり、ユーザー本人の直接裁定Aを `2026-08-03T11:19:54Z` に受領した。Issue、Requirements、Reverse Engineeringで確定済みのcomponent境界は再質問していない。
>
> **leader 承認:** 2026-08-03T11:19:54Z

## 質問選定基準

Issue #1717、承認済み `requirements`、Reverse Engineering成果物で確定済みのcomponent境界は再質問しない。質問対象は、正本間の矛盾または実装・検証契約を変える未確定の設計判断に限定する。

## Q1. capability matrixとlive実行台帳の正本をどの構造にしますか？

`requirements`は両方をversion control下に置き、最終live green SHA・実行日時・adapter・version・結果を機械検証可能にすることを要求しています。一方、具体的な正本構造はApplication Designへ明示的に委譲されています。

A. 型付きTypeScript capability registry + append-only JSONL実行台帳を正本とし、Markdown matrixを導出する（推奨）
B. capabilityと実行履歴を単一のversioned JSON documentで管理する
C. Markdown matrixだけを正本とし、table parserで機械検証する
D. adapterごとのreceipt JSONを蓄積し、indexを都度再構築する
E. Intent auditだけを正本とし、横断台帳は持たない
X. Other (please specify)

[Answer]: A — 型付きTypeScript capability registryとappend-only JSONL実行台帳を正本とし、Markdown matrixを導出する。（ユーザー回答: `1`）

## Cleanup Barrier / C8 Contract

- **Date:** 2026-08-03T23:41:29Z
- **Question:** cleanup barrier失敗をC8 failure receiptへ変換するか、C8未記録のhard errorとして扱うか。
- **[Answer]:** Application Designへ戻し、cleanup barrier成功後だけC8 appendを許可する。barrier失敗は`LiveRunError.cleanup-barrier-failed`としてC8を呼ばず、C8 append成功後だけPASS、supported更新、materialization、projectionを解放する。
