# Domain Entities — eoc1-gate-guard

## 上流入力(consumes 全数)

`../../../inception/application-design/component-methods.md`(QuestionsEvidence 型)、`../../../inception/requirements-analysis/requirements.md`(AC-1a/1b)、`../../../inception/units-generation/unit-of-work.md`(単一ユニット)。

## 型(functional-domain-modeling-ts — 判別ユニオン、class-free)

```ts
export type QuestionsEvidence =
  | { kind: "pass"; reason: "no-file" | "no-answer-tag" | "answer-blank" | "evidence-present" }
  | { kind: "fail"; reason: "no-evidence" | "unparseable-timestamp" };
```

無効状態は表現不能(pass×fail 理由の混在なし)。理由は消費される(state 側がエラー文言分岐に使用+テストが全列挙 assert — 文書のふりフィールド禁止)。
