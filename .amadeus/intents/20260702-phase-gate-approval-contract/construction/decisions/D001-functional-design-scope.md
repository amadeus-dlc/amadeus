# D001: Functional Design scope

## 背景

Construction の開始にあたり、Unit ごとの Functional Design の必要性を判定する必要があった。

## 判断

U001（phase gate の skill 契約）と U002（approval evidence の検査）の Functional Design を `requirement: required` とし、UI 構成なし（`frontendSurface: absent`）として core 3 文書（business-logic-model、business-rules、domain-entities）を作る。

grilling で確定した判断（GD001: トリガーの定義は decision-review に 1 箇所、GD002: 検査は `kind: approval` の実在だけ）を business-rules の BR004 と BR003（U002）に反映した。

## 理由

- U001 は 4 つの迂回路を塞ぐ契約変更であり、業務ルールと Intent Contracts の固定が Task 生成の前提になる。
- U002 は validator の検査追加であり、検査規則と eval の fail 条件の固定が Task 生成の前提になる。
- どちらも skill 文書と validator の変更であり、UI 構成を持たない。

## 影響

- `state.json.construction.functionalDesign.units[]` に両 Unit を `required` / `passed` として記録する。
- B001、B002、B003 の Task 生成は、この Functional Design を設計根拠として参照する。
