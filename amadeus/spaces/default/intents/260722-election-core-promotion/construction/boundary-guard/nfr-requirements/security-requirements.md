# Security Requirements — boundary-guard

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## セキュリティ要件

- 新規の入力境界なし: ガードはリポジトリ内ファイルの読取のみ(business-logic-model の純関数設計 — 外部入力・ネットワーク・秘密情報に触れない)
- allowlist(business-rules BR-2)は id 付き宣言のみで実行時評価の動的パターンを受け付けない。**scripts/ 参照の検出は substring 探索(非 regex)で実装する** — 走査対象がファイル本文(不定長入力)のため、cid:code-generation:regex-linearity-untrusted-input(team.md — 不定長入力を消費する新設 regex は線形性実測を完成条件とする)の適用対象を実装レベルで構造回避する。allowlist の pattern(固定様式の短トークン照合)のみ regex を許し、同 cid の免除カテゴリに該当(※iter1 で requirements 帰属と誤記 — team.md 正本へ訂正)。実装時に「検出 = substring / 免除 = 固定 regex」の分担を再確認する
- 実行環境は technology-stack のとおり Bun 直接実行のリポジトリ内テストで、ネットワーク・秘密情報・外部プロセスに触れない

## 検証

- 追加検査なし(N/A 根拠: 攻撃面の新設なし — build-and-test:c3 の比例選定に従い既存必須 scan のみ)
