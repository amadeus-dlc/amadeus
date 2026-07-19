# Security Requirements — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

| # | 要求 | 導出元 |
| --- | --- | --- |
| S-1 | システム境界(ballot JSON 入力)の全フィールドを fail-closed 検証 — 6分類ラダー(BR-1)+store 段 unknown-ref(BR-3)。無音受理の禁止(construction ガードレール「入力を検証・サニタイズ」の適用) | requirements.md FR-1/FR-3、business-rules.md BR-1〜BR-3 |
| S-2 | 認証情報・シークレットの取扱いなし — ballot/ledger は平文 record(既存設計、変更なし)。新規の秘匿情報を導入しない | technology-stack.md(credential 非保存の既存方針) |
| S-3 | 監査可能性: original の非破壊共存(ADR-5)+timeline 記録 — 訂正の来歴が record に残る(correction trail) | business-rules.md BR-3 |

## 脅威モデル注記

入力は team 起草の ballot ファイル(チーム内ツール、配布外 W-04)— 敵対的入力の脅威は低いが、fail-closed 化の目的は悪意でなく**事故**(E-CCCRA の `__NOW__`)の封鎖である。追加サニタイズ検査は新規入力境界なしにつき N/A(build-and-test:c3)。
