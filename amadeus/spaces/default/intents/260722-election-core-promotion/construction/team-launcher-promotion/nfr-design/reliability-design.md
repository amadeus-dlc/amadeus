# Reliability Design — team-launcher-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- reliability-requirements のフェイルファスト構造: 検査順 = OS → herdr → agmsg(business-logic-model)を bash 関数先頭で直列実行し、いずれかの失敗で即 exit 1(部分起動の構造排除)。set -euo pipefail 維持
- doctor advisory は表示専用(exit 意味論へ不干渉)— 検出失敗も advisory 行の「not found」表示に閉じる(doctor 全体を巻き込まない)
- tech-stack-decisions の BR-7 整合テスト(集合一致 assert)が bash/doctor の定義乖離という将来の信頼性リスクを機械封鎖

## 検証設計

- reliability-requirements の検証割付どおり: fake PATH integration(exit 1+文言4要素)+uname スタブ unit+U4 の e2e 総合。performance-requirements の wall-clock 比較と同一ランで実施可

## 他 NFR との整合

- security-requirements の固定文言テンプレートが信頼性検証(文言 assert)の決定性を担保。scalability-requirements の env 不変が既存経路の回帰を防ぐ
