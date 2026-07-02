# D001: Functional Design scope

## 背景

Construction の開始にあたり、Unit の Functional Design の必要性と、統合契約の記述モデルの確定が必要だった。

## 判断

U001（phase PR 統合契約）の Functional Design を `requirement: required` とし、UI 構成なし（`frontendSurface: absent`）として core 3 文書を作る。

統合契約は「既定は phase ごとの PR、統合は 3 条件必須の例外」（BR001、BR002）、「統合範囲は仕様側のみ」（BR003、BR004）、「記録項目と gate 独立」（BR005、BR006）、「粒度制約と整合」（BR007、BR008）でモデル化する。

## 理由

Inception の grilling（GD001〜GD003）で確定した判断を、policy 文言の判定基準として固定するため。

## 影響

B001 と B002 の Task 生成は、この Functional Design を設計根拠として参照する。
