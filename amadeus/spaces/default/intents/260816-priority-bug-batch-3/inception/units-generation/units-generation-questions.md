# Units Generation — 分解質問(intent 260816-priority-bug-batch-3)

> 裁定承認: 本ファイルの回答と分解計画は Intent Autonomy Mode = full の decide-question 梯子で AUTO_DECIDED(計画承認 = q-ug-decomposition-plan、2026-08-17 の INTENT_AUTONOMY_TRANSACTION_COMMITTED)。前提の方式裁定は選挙 E-260817-PBB3-FIX-METHODS(decisions.md ADR-1〜5)。

## Q1: unit 境界戦略

A. Issue 単位(1 Issue = 1 Unit) / B. コンポーネント単位 / C. ファイル単位 / X. Other

[Answer]: A — intent 発注文が「1 Issue = 1 Unit = 1 PR」を明示宣言(cid:units-generation:c1 の原則どおり)。選挙 E-260817-PBB3-FIX-METHODS の5裁定が Issue 単位に1:1対応しており境界が自然。

## Q2: 粒度

A. 細粒度(5 unit) / B. 粗粒度(領域統合で 2-3 unit) / X. Other

[Answer]: A — 5 Issue = 5 unit。統合は 1 Issue = 1 Unit 原則(cid:units-generation:c1)に反し、oq-singleton 制約回避のための recompose(units-generation EXECUTE)の前提とも不整合。

## Q3: 依存順序

A. 独立 unit の並行を許す(真の実装依存のみエッジ化) / B. 厳密トポロジカルのみ / X. Other

[Answer]: A — 真の実装依存は milestone-presence → autonomy-refusal-idem の1本のみ(decisions.md ADR-1 実装契約2)。同一ファイル交差(amadeus-state.ts)による直列化は 2.8 の経済判断へ委ねる(トポロジーと経済順序の分離 — 本ステージ NOTE)。

## Q4: unit 間の統合点とデプロイモデル

統合点: A. 共有 engine ファイルの write scope 境界で統合(API 変更なし) / B. 新規契約の導入。 デプロイ: A. 単一リポジトリの monolithic(現行どおり)。 / X. Other

[Answer]: 統合点 = A、デプロイ = A — 全 unit が既存コンポーネントの欠陥修正で新規公開 API なし(component-methods.md 横断事項)。統合点は ProductionAutonomyContext の戻り値拡張(U-autonomy-refusal-idem が供給、U-milestone-presence が消費)のみ。デプロイ基盤なし(project.md Deployment)、全 unit が同一リポジトリ・同一配布経路。

## 曖昧性分析

回答に矛盾なし。計画承認は AUTO_DECIDED(approve-plan)。
