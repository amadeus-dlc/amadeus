# Scalability Design — boundary-guard

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- scalability-requirements の「roots 定数1箇所」を実装形に固定: ScanRoot[] の canonical 定数(business-logic-model の BR-7 対応)を guard テストファイル内の単一 export とし、配布面追加時は定数1行追記+corpus sweep 再実測のみ
- tech-stack-decisions の採番・配置規約に従う(新規機構なし)

## 検証設計

- scalability-requirements の検証(roots 追加時の手順)は定数のドキュメントコメントに count-free で記す(count-comment-sync 回避)

## 他 NFR との整合

- roots 拡張時の再実測は reliability-requirements の sweep 偽赤 0 と performance-requirements の予算内検証を同時に再確認する1操作。security-requirements の allowlist 構造(id 付き)は roots 拡張後も安全に増分適用できる
