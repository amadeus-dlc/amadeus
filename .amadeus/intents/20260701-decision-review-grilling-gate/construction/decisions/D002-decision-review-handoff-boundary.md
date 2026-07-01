# D002 Decision Review Handoff Boundary

## 状態

accepted。

## 背景

decision review が質問まで実行すると、質問作法と Grilling Decision Trail の責務が `amadeus-grilling` と重複する。

## 判断

decision review は質問実行をしない。
decision review は、質問が必要な場合に一問、確認理由、推奨回答、推奨理由、反映先候補を `amadeus-grilling` へ渡す。

## 根拠

- R003。
- UC002。
- U001 Unit Design Brief。

## 影響

B001 は内部 skill 契約で handoff 項目を定義する。
Grilling Decision Trail の記録構造は変更しない。
