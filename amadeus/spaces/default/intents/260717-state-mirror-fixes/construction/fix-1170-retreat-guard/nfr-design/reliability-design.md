# Reliability Design — fix-1170-retreat-guard(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(R-1〜R-5 の実現)

| 要件 | 設計 |
|---|---|
| R-1 torn-write | writeStateFile を不変利用(tmp+rename 継承 — 変更しない) |
| R-2 lost-update | withAuditLock ラップ+ロック内再 read 比較(business-logic-model の lock→read→compare→write)。検証は BR-3 の並列 spawn テスト |
| R-3 loud 失敗 | die(ロック前)/withAuditLock throw(取得失敗)を不変継承。後退 no-op は stderr advisory 1行で可観測 |
| R-4 異常終了時のロック解放 | withAuditLock の on-exit ハンドラを不変継承(reliability-requirements.md R-4 実測) |
| R-5 audit 非干渉 | appendAudit 呼び出しを追加しない(BR-6 の非追記 assert で検証) |

## 失敗モードと回復

- ロック取得失敗(5秒超の競合): throw → hook が非ゼロ exit を recordHookDrop(既存可観測経路)→ TaskUpdate 次回発火で自然リトライ(hook の発火特性による回復 — 新規リトライ機構は作らない)
