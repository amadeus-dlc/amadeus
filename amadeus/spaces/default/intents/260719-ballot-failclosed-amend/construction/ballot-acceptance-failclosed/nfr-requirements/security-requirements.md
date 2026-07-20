# Security Requirements — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

| # | 要求 | 導出元 |
| --- | --- | --- |
| S-1 | システム境界(ballot JSON 入力)の全フィールドを fail-closed 検証 — 6分類ラダー(BR-1)+store 段 unknown-ref(BR-3)。無音受理の禁止(construction ガードレール「入力を検証・サニタイズ」の適用) | requirements.md FR-1/FR-3、business-rules.md BR-1〜BR-3 |
| S-2 | 認証情報・シークレットの取扱いなし — BallotShape の全フィールド(domain-entities.md: electionId/voter/voterKind/choiceInternalNo/submittedAt/goa/reservation/rationale/kind/ref)に credential 相当が存在せず、本 Unit は新規フィールドとして kind/ref のみ追加(いずれも識別子)。実行系は technology-stack.md のとおり Bun/TS のローカル CLI で、ネットワーク境界・外部サービス認証は導入しない | domain-entities.md(フィールド定義の直接確認)+technology-stack.md(実行系の文脈) |
| S-3 | 監査可能性: original の非破壊共存(ADR-5)+timeline 記録 — 訂正の来歴が record に残る(correction trail) | business-rules.md BR-3 |

## 脅威モデル注記

入力は team 起草の ballot ファイル(チーム内ツール、配布外 W-04)— 敵対的入力の脅威は低いが、fail-closed 化の目的は悪意でなく**事故**(E-CCCRA の `__NOW__`)の封鎖である。追加サニタイズ検査は新規入力境界なしにつき N/A(build-and-test:c3)。
