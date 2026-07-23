# Security Test Instructions — 260723-marker-heading-exemption

上流入力(consumes 全数): code-generation-plan、code-summary

## 選定判断(cid:build-and-test:c3)

セキュリティ専用テストは **N/A** — 反証可能な根拠: (1) 攻撃面の拡大なし — 入力は従来どおり output-path のファイル名 stem のみで、新規の外部入力・認証境界・秘密情報の取り扱いを追加しない。(2) 免除判定は endsWith 2比較の決定的述語で、信頼境界外の不定長入力を消費する新設 regex に該当しない(cid:regex-linearity-untrusted-input の適用範囲外)。(3) 既存必須 scan(CI の lint/typecheck/drift guard 群)は本 PR で全て green — 省略ではなく既存ゲートの通過を実測済み。

本判断は既存必須検査の省略根拠にはしない(同 cid の但し書きどおり)。

## 再評価条件

次のいずれかが成立した時点で N/A 判定を再評価する: (1) センサーが新規の外部入力面(ネットワーク・環境変数由来の可変パス等)を獲得した (2) 免除判定が設定ファイル・外部データ駆動へ拡張された (3) 承認済み NFR にセキュリティ要件が追加された。既存必須 scan(lint/typecheck/drift guard)の通過は毎 PR の CI で継続的に実測される。
