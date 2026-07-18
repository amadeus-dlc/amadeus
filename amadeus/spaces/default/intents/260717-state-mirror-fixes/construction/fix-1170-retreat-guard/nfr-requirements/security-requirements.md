# Security Requirements — fix-1170-retreat-guard(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件

| # | 要件 | 根拠 |
|---|---|---|
| S-1 | 新規入力面を追加しない — CLI 引数契約不変(NFR-1)、stderr advisory はローカル出力のみで機密情報(パス以外)を含めない | requirements NFR-1、advisory 書式は stage 名+checkbox 状態のみ(business-logic-model) |
| S-2 | 認証情報・シークレットの取り扱いなし(construction ガードレールの該当なし確認) | 変更面は state ファイル RMW のみ — 反証可能: handleSetStatus の全 setField 対象は state 管理フィールド6種 |
| S-3 | ロック機構は既存 withAuditLock の再利用 — 新規ロックファイル・tmpdir 面を作らない(攻撃面不変) | ADR-1(amadeus-lib.ts:4266 再利用) |

## 前提(technology-stack 由来)

technology-stack.md のとおり外部サービス・ネットワーク I/O を持たないローカル CLI 構成 — ネットワーク面のセキュリティ要件は N/A(反証可能: 変更面に fetch/socket なし)。
