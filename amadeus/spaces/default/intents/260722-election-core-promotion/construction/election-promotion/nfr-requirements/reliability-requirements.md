# Reliability Requirements — election-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 信頼性要件

- 挙動不変の機械保証: business-rules BR-2(import 1行以外の diff 禁止+t234〜t244 green)と BR-5(dist:check / promote:self:check / typecheck / lint / --ci 全 green = requirements NFR-1)が移動の信頼性を全面担保
- U1 重複不変量(BR-1)がコピー残置事故を機械検出 — 移動の削除側の信頼性(business-logic-model の P5 規律)
- technology-stack の既存テスト4層構成に変更なし(テストはパス追随のみ)

## 検証

- business-rules の検証割付どおりの**区分**で: BR-1/BR-3/BR-4 = 機械確認(grep / ls / U1 テスト)、BR-2/BR-5 = 既存テスト+CI コマンド exit 0、**BR-6 = レビュー観点(人間判断 — 機械確認と混同しない)**
