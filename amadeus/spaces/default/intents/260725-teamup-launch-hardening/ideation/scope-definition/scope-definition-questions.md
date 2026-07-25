# Scope Definition — Questions（260725-teamup-launch-hardening / #1476, #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/feasibility-assessment.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/constraint-register.md`

- `intent-statement.md` — 「スコープ」節の含む／含まない、および Q1/Q3 裁定（出荷単位・完了条件）を引き継いだ。
- `feasibility-assessment.md` — 両ユニットの GO 判定と、U1 の必須条件（待機設計の変更）を引き、スコープの必須項目として確定した。
- `constraint-register.md` — C-14〜C-17（裁定由来の制約）と C-18〜C-21（実測由来の数値）を、スコープ境界と受け入れ基準の根拠として参照した。

## E-OC1 選挙不要判定

判定: **選挙不要（ソロモード）**。根拠種別 = 運用形態。`AMADEUS_OPERATING_MODE` は未設定でありソロモード（team.md § Operating Modes）。

leader 承認: 2026-07-25T11:20Z — ユーザーが conductor へ直接指示。本ステージのスコープ境界は intent-capture Q1/Q3 と feasibility Q1/Q2 の既決裁定から機械的に導出でき、**新たな未決事項は生じなかった**。

## 既決事項の参照（本ステージで再度問わない）

`cid:requirements-analysis:no-election-for-decided-norms` に従い、以下は既決として適用する。

| 事項 | 裁定 | 出典 |
|---|---|---|
| 出荷単位 | ユニットごとに2 PR | intent-capture Q1 = A |
| 不成立時の分岐 | 別 readiness 指標へ切替（**発動せず** — feasibility 実験2で actas 移行が成立） | intent-capture Q2 = B |
| 完了条件 | 実測2点 + テスト構造の是正 | intent-capture Q3 = A |
| U1 の待機設計 | 検証を `mux_attach` の後ろへ移す | feasibility Q1 = A |
| 並列度 | 固定上限4 | feasibility Q2 = A |

## 本ステージで新たに必要な裁定

**なし。** 上記5件の既決裁定と feasibility の実測により、スコープ境界は一意に定まる。
