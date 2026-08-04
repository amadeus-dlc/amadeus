# Functional Design Questions — codex-live-walking-skeleton

参照入力: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

> **E-OC1 既決照合:** 上流成果物がU01のworkflow、entities、rules、integration、errors、edge casesを一意に定義しており、矛盾・欠落はない。Issue #1717で確定済みの事項は再質問しない。
>
> **leader 承認:** 2026-08-03T13:53:30Z

## 質問選定基準

Issue #1717、承認済みApplication Design、Units Generation、Delivery Planningから確定できるworkflow、entity、rule、integration、error、edge caseは再質問しない。Functional Design成果物を一意に作れない矛盾または欠落だけを質問対象とする。

## Functional Design Plan

U01はfrontend/UIを含まない`library`であるため、`frontend-components.md`は生成しない。次の3成果物を作る。

- `business-logic-model.md`: policy評価、preflight、scratch lifecycle、Codex journey、cleanup、receipt、ledger append、matrix projectionの処理順序と失敗分岐。
- `business-rules.md`: strict opt-in、GHA hard deny、env allow-list、closed result、timeout/retry/cleanup、ledger/projection、runbookの不変条件。
- `domain-entities.md`: `LiveCode`、policy decision、adapter descriptor、journey specification、run context/result、receipt、registry entry、ledger record、matrix rowの型と状態遷移。

上流成果物間に、成果物生成を妨げる未解決の矛盾・欠落はない。

## 回答モード

A. Guide me
B. Grill me
C. I'll edit the file
D. Chat
X. Other (please specify)

[Answer]: A — Guide me。（ユーザー回答: `1`）

## Reviewer上限到達後の人間裁定

Iteration 2で次のBLOCKERが残り、reviewer上限2回へ到達した。

1. `CredentialBinding`のproducer、入力source、C5→C4引渡し、破棄責任が未定義。
2. generic scratch副作用より後に`ResourceRegistrar`を生成するworkflow順序が、事前登録ruleと矛盾。
3. directory fsync失敗時にpending markerとlive-owner lockが残り、recoveryがlockを取得できない。

A. 3契約を修正し、人間裁定で解消扱いとして続行する
B. Application Designを再開し、上流contractから改訂する
C. stageを未完了のまま停止する
X. Other (please specify)

[Answer]: A — 3契約を修正し、人間裁定で解消扱いとして続行する。（ユーザー回答: `1`）
