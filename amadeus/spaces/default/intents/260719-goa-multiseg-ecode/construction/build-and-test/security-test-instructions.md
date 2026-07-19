# Security Test Instructions — 260719-goa-multiseg-ecode

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 攻撃面評価(devsecops 観点)

変更は local ファイル(team.md 等の repo 内 corpus)を読む CLI の parse regex 受理拡大のみ。新規の入力経路・認証面・秘密情報・外部通信は追加しない(code-generation-plan.md / code-summary.md)。既存必須スキャンの省略はしない(CI の既存ゲートは全て green — build-test-results.md)。

## 実施検査: ReDoS 耐性(実測)

拡張形 `E-[A-Z0-9]+(?:-[A-Z0-9]+)*` は隣接文字クラスが `-` で分離され破滅的バックトラックを生まない構造だが、机上判定で終えず実測した:

- 敵対入力(`A-` 50,000 反復+不一致終端、計 ~100KB)で `GOA_HEAD_RE` 3.4ms / `PM_CID_RE` 5.3ms(bun、scratch 実行)— 線形挙動を確認、指数爆発なし

## 合否基準

上記実測が 100ms 未満であること(達成)。新規 secrets/入力境界なしのため追加のサニタイズ検査は N/A(根拠: 変更 diff 全文レビュー済み — PR #1256、e4 READY)。
