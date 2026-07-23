# Reliability Design — election-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- reliability-requirements の機械保証群を実装手順に固定(business-logic-model の順序に準拠 — ※iter1 の逆順は無申告逸脱として是正): (1) git mv(履歴保存)→ (2) import 1行修正 → (3) SKILL.md 書き換え → (4) **U1 live 検査 green(残置・層またぎ検出 — 再生成より先**、残置混入を配布前に遮断)→ (5) テストパス追随 → (6) 再生成 → (7) BR-5 全コマンド green。各段が前段の失敗を機械検出
- business-logic-model の「移動後 import 全数の第3再列挙」が横断依存の取りこぼしを防ぐ
- tech-stack-decisions の ADR 正本参照方針により文書二重化由来の drift も構造回避

## 検証設計

- reliability-requirements の検証割付(全機械確認)どおり — grep / ls / t234〜t244 / CI コマンド exit 0。performance-requirements の wall-clock 比較と同一ランで完結

## 他 NFR との整合

- security-requirements の変更面最小性が信頼性検証の diff 検分を単純化。scalability-requirements の固定集合が検証の全数性を有限に保つ
