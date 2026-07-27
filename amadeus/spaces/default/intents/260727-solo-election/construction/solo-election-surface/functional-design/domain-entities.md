# Domain Entities — solo-election-surface (U2)

上流入力(consumes 全数): component-methods.md(内挿点)、business-logic-model.md(手順論理)、requirements.md(FR-11 の契約不変)、unit-of-work.md(U2 が型を持たない境界)、components.md(SKILL/team.md の所在)、services.md(手順が参照する実行時役割)、unit-of-work-story-map.md(手順とジャーニーの対応)。

## エンティティ変更: なし

U2 は prose(SKILL.md・team.md・docs)とテストのみの Unit であり、TypeScript の型・データ構造を一切追加・変更しない(ADR-3 の TS 正本主義 — 規則は U1 で実装済みの canonical が唯一の正本)。

## 参照するエンティティ(読み取りのみ)

- DeliveryDirective = {voter, viewPath, spawnInstruction}(amadeus-election-transport.ts:52-56 — viewPath がテンプレ変数源。electionId はこの型に含まれず、conductor がループ外で保持する)
- HoldReason "split" ほか U1 が実装する語彙(U1→U2 依存により U2 着手時点で実装済みとなる — 人間委譲節の文言が指す対象)
- t242 の REQUIRED_SECTIONS / 禁止語彙リスト(内挿の契約境界)
