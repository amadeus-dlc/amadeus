# Security Requirements — clean-env-e2e

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## セキュリティ要件

- business-rules BR-2(隔離の完全性): 実 HOME・実 PATH・実バイナリへ一切触れない — temp prefix の assert で機械担保。実 ~/.agents への書込 0(誤爆時は実環境の agmsg DB を汚染しうるため、この隔離自体が本 Unit の最重要セキュリティ要件)
- fake shim(business-logic-model の fake seam)は固定文字列の記録のみで外部入力を実行しない。requirements FR-6b のとおり herdr/agmsg 実コードは使用しない
- technology-stack の node-pty/@xterm 既存 e2e 基盤の枠内 — 新規のネットワーク・秘密情報なし

## 検証

- 追加検査なし(N/A 根拠: 攻撃面の新設なし — build-and-test:c3。隔離 assert 自体がセキュリティ検証を兼ねる)
