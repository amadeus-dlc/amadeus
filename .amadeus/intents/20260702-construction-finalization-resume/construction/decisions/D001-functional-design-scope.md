# D001: Functional Design scope

## 背景

Intent `20260702-construction-finalization-resume` の Unit は U001 の1件であり、変更対象は `amadeus-construction` の skill 本文と同梱スクリプトである。

## 判断

- U001 の Functional Design を `requirement: required` とし、core 3 文書を作る。
- UI 構成はないため `frontendSurface: absent` とし、`frontend-components.md` は作らない。
- 対象解決元は `state.json.construction.targetBolts`（B001、B002）である。

## 理由

未 finalize の判定規則と検出契約は、スクリプトと skill 本文の両方が参照する共通の規則であり、Functional Design を管理元にする価値がある。

## 影響

- B001 と B002 の Task Generation は、U001 の Functional Design と Unit Design Brief を根拠にする。
