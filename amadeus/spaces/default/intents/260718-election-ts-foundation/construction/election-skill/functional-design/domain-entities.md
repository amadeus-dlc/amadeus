# Domain Entities — election-skill(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## エンティティ

U6 はコード型を持たない(SKILL.md 文書+検査テストのみ)。検査側の型:

| 型 | 形 | 由来 |
|---|---|---|
| `ForbiddenVocab` | 禁止語彙の canonical 配列(検査テスト内の1定義 — 複数箇所への手書き複製をしない) | FR-8a、construction ガードレール(canonical 1定義) |

## 不変条件

- SKILL.md は指令転送の記述のみ(選挙知識の正本性は TS 側 — FR-0 の系)

## 型の消費関係

ForbiddenVocab は BR-K1/K2 の検査テストのみが消費する(本番コード側に選挙知識の語彙表を持ち込まない — FR-0 の系)。
