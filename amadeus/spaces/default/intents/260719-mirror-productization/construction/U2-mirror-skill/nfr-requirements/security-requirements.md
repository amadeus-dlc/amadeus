# Security Requirements — U2-mirror-skill

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## SR-U2-1: 権限昇格面なし

SKILL は既存ツール(amadeus-mirror.ts)の呼出案内のみ(BR-U2-1)— 新しい実行権限・認証面を導入しない。gh 認証は U1 経由(keyring 委譲)。

## SR-U2-2: 指示注入面の最小化

SKILL 本文は静的文書(ユーザー入力の埋め込み・動的生成なし)。診断出力の解釈は人間が行い、SKILL が出力テキストを機械実行しない(instruction-like-text-rejection と整合する設計)。
