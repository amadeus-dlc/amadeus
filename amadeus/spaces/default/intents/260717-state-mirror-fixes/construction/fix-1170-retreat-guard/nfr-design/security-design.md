# Security Design — fix-1170-retreat-guard(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(S-1〜S-3 の実現)

- S-1(新規入力面なし): argv 解釈は既存 flags パースを不変利用。advisory 文言は stage 名+checkbox 状態のみを埋め込む固定テンプレート(business-logic-model の advisory 書式)— 任意文字列の echo をしない
- S-2(秘匿情報なし): 触るフィールドは state 管理6種のみ(security-requirements.md S-2 の反証面を diff レビューで検証)
- S-3(攻撃面不変): ロックは既存 withAuditLock ドメイン参加のみ — 新規 tmpdir・ロックファイルパスを作らない

## セキュリティレビュー観点(PR レビュアー向け)

diff に (a) 新規入力面 (b) 新規ファイルパス (c) shell 実行 が現れないことを grep で機械確認する。
