# Functional Design — 質問票（0問様式、unit: convergence-budgets）

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 選挙不要判定（E-OC1 証跡）

- 判定: 質問 0 問。`current < cap` の atomic reserve、cap 到達後の拒否、retry schema／初期 allowlist、停止・継続の境界は FR-02／FR-03／FR-04A、C2／C3 と承認済み error contract から一意に導出できる。具体的な default／hard cap 値は FR-08.3 により NFR Requirements へ留保されている（根拠種別: 既決裁定からの一意導出、1問1行）。
- ユーザー承認: 2026-08-02T04:52:03Z（「Functional Design 全4 Unitを0問で進める」への回答 `1`）

## 裁定の記録

- Functional Design で追加の意味判断を求めず、承認済み予算・再試行契約を型・状態遷移・業務規則へ具体化する方針を提案する。
- ユーザー承認: 2026-08-02T04:52:03Z
