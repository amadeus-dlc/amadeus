# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | phase skill の人間ゲートと grilling 起動を決定論的な契約にする。 | R001, R002, R003, R005 | BC001 | なし | [U001-phase-gate-skill-contract.md](units/U001-phase-gate-skill-contract.md) |
| U002 | taskGeneration passed の承認 evidence を validator で検査する。 | R004, R005 | BC001 | U001 | [U002-approval-evidence-validation.md](units/U002-approval-evidence-validation.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | ゲート契約の定義は他の Unit に依存せず成立するため。 |
| U002 | U001 | 検査対象の approval evidence の追加手順は、U001 のゲート契約で確定するため。 |
