# Reliability Design — team-mode-docs

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- reliability-requirements の参照整合3面を実装形に固定: (a) t174 系ガード green(en/ja 対・言語切替リンク)(b) 旧 scripts/ パスの docs 全域 grep 0 件(business-logic-model の機械チェック (d) — t174 の検査範囲に依存しない独立確認)(c) 転記元 ref の併記(U2/U3 着地物からの転記 — 記憶起草禁止)
- tech-stack-decisions のガイド番号衝突再確認を実装冒頭の定型に置く(並行 intent との衝突を早期検出)

## 検証設計

- reliability-requirements の検証割付どおり(BR-1/2/7/8 = 機械、BR-3〜6 = 生成後 grep+PR レビュー)

## 他 NFR との整合

- security-requirements の URL 固定が参照整合検査の語彙を安定化。scalability-requirements の閉集合が grep の全数性を保証。performance-requirements の既存 CI 枠内実行と同一ラン
