# Logical Components — election-model(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## モジュール構成

| コンポーネント | 責務 | 公開 API(狭い面のみ) |
|---|---|---|
| `scripts/amadeus-election-model.ts` | U1 全体(型+純関数)— tech-stack-decisions.md の配置確定に従う単一モジュール | 型: Election/Ballot/Goa/DistributionView/TallyResult ほか。関数: Election.parse/Ballot.parse(コンパニオン)、shuffleView/tally/canEarlyTally/classifyLate |
| 内部(非公開) | fnv1a/mulberry32/fisherYates — 実装詳細として非 export(情報隠蔽) | なし(テストは公開 API の決定性 assert 経由 — BR-10) |

- スタイルは functional-domain-modeling-ts 既決(project.md): type+コンパニオンオブジェクト、ブランド型+スマートコンストラクタ、判別ユニオン Result(security-design.md/reliability-design.md の型設計と一体)
- 依存方向: U1 は他ユニットに依存しない(business-logic-model.md — 純関数層が最下層。U2/U3/U5 が U1 型を import する一方向)

## テスト配置

- unit 層(fs 非依存 — performance-requirements.md 測定と検証節)。BR-1〜BR-11 の全テストが公開 API 経由で、内部関数の直接テストは行わない(実装詳細の隠蔽維持)
