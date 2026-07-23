# Reliability Requirements — team-mode-docs

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 信頼性要件

- docs の「壊れない」性 = 参照整合: business-rules BR-1(t174 系ガード+言語切替リンク相互 grep)と BR-8(旧 scripts/ パスの docs 全域 grep 0 件)が機械担保(requirements FR-7a/7b の受け入れ面)
- 転記の正確性: business-rules BR-3(U2/U3 着地物からの転記+実測 ref 併記 — 記憶起草禁止)が stale 記述を構造防止。business-logic-model の執筆順序(U2/U3 着地後に確定パス転記)と同一機序
- technology-stack の en/ja 対規約により対訳の非対称ドリフトもガード対象

## 検証

- business-rules の検証割付どおり(**BR-1/BR-2/BR-7/BR-8 = 機械確認**(t174 系ガード・リンク grep・templates diff grep・旧パス grep)、**BR-3〜BR-6 = 生成後 grep+PR レビュー観点** — 区分を混同しない。※iter1 で BR-7 をレビュー側へ誤分類 — BR-7 セル逐語「git diff --name-only の該当パス grep 0 件」= 機械確認へ訂正)
