# Delivery Planning: 外部依存マップ

本 intent はリポジトリ内で完結する AI 実行の取り組みであり、外部チーム・外部 API・データ提供ウィンドウ・承認リードタイムを持たない。`delivery-planning-questions.md` の Q3 人間回答に基づき、gated item は次の 1 件のみを記録する。

## Gated Items

| # | 項目 | Owner | リードタイム | ブロック対象 Bolt | 緩和 / 回避策 |
|---|---|---|---|---|---|
| G1 | TLC 実行環境（CI 上の Docker ベース model-check は workflow_dispatch 限定運用） | 本 intent（既存資産の再利用） | なし | Bolt 3（U3 proof 実測）、Bolt 6（U5 E2E） | 受け入れ実測はローカル TLC 実行で行い、CI 側は既存 `formal-model-check` の workflow_dispatch 経路を無変更で再利用する（`inception/application-design/decisions.md` ADR-5） |

## 記録上の注記

- 上記以外に外部依存はない。`inception/units-generation/unit-of-work.md` の 6 unit はすべてリポジトリ内成果物であり、`unit-of-work-dependency.md` の依存辺もすべて内部辺である。
- 要求（`inception/requirements-analysis/requirements.md` §7 前提）どおり外部期限は存在しない。
- `stories.md` / mockups / team-formation 成果物は SKIP により存在しない（`unit-of-work-story-map.md` が FR/AC 単位で対応済み）。設計正本は `inception/application-design/components.md`。team-practices（`memory/team.md`、`memory/project.md`）に外部依存に関する追加規範はない。
