# Functional Design 質問 — eligibility-report

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. 適格性とwinnerの閉じ方

- A. 全件検出・HARNESS_ERRORなし・baseline false positive 0を先に要求し、両arm適格時だけ3軸Paretoを行う
- B. 不適格条件とcostをweighted scoreへ合算する
- C. どれか1軸が最小のarmをwinnerにする
- X. その他

[Answer]: A — 一方だけ適格ならそのarm、両方不適格なら`BOTH_INELIGIBLE`、両方適格でtrade-offまたは同値なら`BOTH_ELIGIBLE_NO_WINNER`とする。（E-FVERA2R / E-FVEAD1）
**Basis:** `requirements.md` FR-6、`component-methods.md` evaluator contract

## Q2. Alloy trigger

- A. defectの`NOT_DETECTED`を契約class付きで記録し、別裁定を要求するが自動追加しない
- B. missが1件でもあれば同じintentへAlloyを即時実装する
- C. 両arm共通missだけを記録しarm固有missを捨てる
- X. その他

[Answer]: A — 全missを保存し、共通blind spotを別集計して`SEPARATE_DECISION_REQUIRED`を記録する。Alloy実装は本Unitに含めない。（E-FVERA3R / E-FVEAD3）
**Basis:** `requirements.md` FR-7、`unit-of-work.md` U8境界

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. report dashboardを追加する
- C. interactive Pareto chartを追加する
- X. その他

[Answer]: A — `services.md` はnon-interactive local CLIとJSON / Markdown reportを定義するため、optional `frontend-components.md` は生成しない。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` deployment境界
