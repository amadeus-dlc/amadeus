# ドメインエンティティ — unit: evaluator-vocabulary

## エンティティ一覧

| エンティティ | 説明 |
|---|---|
| 旧 evaluator（廃止概念） | #240 が構想した未実装の独立評価機構。#439 の読み替え対象 |
| sensors（現行実体） | gate 時に stage 成果物へ自動 fire する決定論的検査（required-sections / upstream-coverage / linter / type-check）。SENSOR_FIRED を記録。検査対象は matches glob の範囲（Construction 設計成果物系）に限る |
| PR レビュー（現行実体） | 人間とレビューボットによる PR 単位の検出。旧 evaluator 候補のうち sensors がカバーしない項目（PR 説明の不足など）の実際の検出主体 |
| Skill Contract consumer role `evaluator`（別概念・現行） | skill-contract.md の消費者ロール。生きた契約であり本 Intent では不変。改名要否は別議論 |
| 歴史的記録 | audit・過去 record・Issue 引用。不変 |

## 不変条件

- 「旧 evaluator」を独立機構として指す規範記述は、読み替え後に 0 件。
- sensors・PR レビュー・Skill Contract role・歴史的記録の 4 エンティティは実体を変更しない（記述の帰属先を正すのみ）。
