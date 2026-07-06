# Decision Log — 260706-harness-codex（Ideation）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)。

## 判断一覧
正準の記録は `audit/` の DECISION_RECORDED（追記型）である。本ファイルは Ideation 分の索引。

| # | 判断 | ステージ | 種別 | 記録 |
|---|---|---|---|---|
| 1 | Intent 作成の承認 4 項目 + Phase 分割（Phase 2 は後続 Intent） | intent-capture 宛 | 人間承認（ディスパッチ） | DECISION_RECORDED 2026-07-06T05:44 頃 |
| 2 | 設計論点ピア協議は feasibility で実施 / scope は feature 維持 | intent-capture | 解釈確定（gate 承認） | 中継承認 05:47:25Z |
| 3 | market-research の理由付き skip（内部ツール + build-vs-buy 確定済み） | market-research | 条件判定 | skip 記録 05:48:25Z、gate 承認 05:56:51Z に含む |
| 4 | 設計論点 6 問の確定（Q1=A/Q2=A/Q3=A/Q4=A/Q5=A/Q6=B、5/5 一致、engineer3 非接触確定、実測裏取り 3 件） | feasibility | ピア協議 + 人間承認 | DECISION_RECORDED + 中継承認 05:56:51Z |
| 5 | 境界細部 2 問（上流対応 skill のみ / harness/codex は 2 文書のみ） | scope-definition | 自己判断 + 人間承認 | 中継承認 06:00:27Z |
| 6 | team-formation skip（既存多体連携体制で編成不要） | team-formation | 条件判定 | skip 記録 06:01:04Z |
| 7 | rough-mockups skip（UI なし） | rough-mockups | 条件判定 | skip 記録 06:01:12Z |

## 未決事項（後続ステージへ）

- 上流 38 skill → amadeus skill の具体的写像表（Construction の P1-2 で作成、parity-map skillNameMapping 準拠）。
- provenance の記録様式（source yaml ヘッダコメントか別ファイルか。functional-design で確定）。
