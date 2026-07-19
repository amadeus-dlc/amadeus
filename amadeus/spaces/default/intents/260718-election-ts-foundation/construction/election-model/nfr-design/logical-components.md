# Logical Components — election-model(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、domain-entities.md

## モジュール構成

| コンポーネント | 責務 | 公開 API(狭い面のみ) |
|---|---|---|
| `scripts/amadeus-election-model.ts` | U1 全体(型+純関数)— 配置の典拠は unit-of-work.md U1 行の宣言+ADR-1(U-01=B 裁定)(reviewer Major 是正: tech-stack-decisions.md への誤帰属を訂正 — 同書はランタイム・hash 選定の典拠)| 型: Election/Ballot/Goa/DistributionView/TallyResult ほか。関数: Election.parse/Ballot.parse(コンパニオン)、shuffleView/tally/canEarlyTally/classifyLate |
| 内部(非公開) | fnv1a/mulberry32/fisherYates — 実装詳細として非 export(情報隠蔽) | なし(テストは公開 API の決定性 assert 経由 — BR-10) |

- スタイルは functional-domain-modeling-ts 既決(project.md Code Style): type+コンパニオンオブジェクト、ブランド型+スマートコンストラクタ、判別ユニオン Result(security-design.md/reliability-design.md の型設計と一体)。**適合確認**: Election.parse/Ballot.parse はコンパニオン static 相当、tally/shuffleView 等の全域関数はコレクション演算としてコンパニオンに置く — 貧血型(裸 type+外部関数)にも全面 static 寄せにも該当しない(functional-design:c11 の役割分担に整合)
- 依存方向: U1 は他ユニットに依存しない(depends_on: [] — unit-of-work-dependency.md:19)。U1 へ直接依存するのは **U2/U3/U4/U5 の4ユニット**(同 :21/:23/:25/:27 — reviewer Major 是正: 旧記載は U4 election-transport の ShortNotification/DeliveryRecord 型依存 :12 を見落とし)

## テスト配置

- unit 層(fs 非依存 — performance-requirements.md 測定と検証節)。BR-1〜BR-11 の全テストが公開 API 経由で、内部関数の直接テストは行わない(実装詳細の隠蔽維持)
