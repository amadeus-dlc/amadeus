# Units Generation 質問 — 260725-kimi-harness

> モード: 質問なし(参照質問は全て設計成果物から導出可能 — requirements-analysis:c5 準拠)。分解案の承認は Step 5 の構造化質問で行う

## 参照質問の判定

- **Unit boundary strategy**: 導出済み。components.md の C1-C6 がそのまま境界(コンポーネント = デプロイ可能単位)
- **Unit granularity**: 導出済み。application-design の FR↔C トレーサビリティ表に従う(FR-6/FR-7/FR-8 は既存コンポーネントの検証・文書面に帰属)
- **Dependency ordering**: 導出済み。component-dependency.md の3経路(hook/導入/doctor)がトポロジを与える。並列化は DAG が許す範囲(経済的順序付けは 2.8 の領域)
- **Integration points**: 導出済み。component-dependency.md の依存マトリクスそのまま
- **Deployment model**: 導出済み。全 unit が独立 PR として deployable(trunk ベース、squash マージ — org.md)
