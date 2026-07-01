# Construction 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | README の Internal Skills 分類をユーザー判断に合わせる。 | active | なし | [D001-readme-skill-classification.md](decisions/D001-readme-skill-classification.md) |
| D002 | 内部 skill の Codex metadata で暗黙起動を抑制する。 | active | D001 | [D002-codex-internal-skill-policy.md](decisions/D002-codex-internal-skill-policy.md) |
| D003 | Issue #284 の監査と英語化を後続候補に分離する。 | active | D001, D002 | [D003-follow-up-scope-separation.md](decisions/D003-follow-up-scope-separation.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | README の分類が metadata 対象の入力になるため。 |
| D002 | D001 | Codex metadata は内部 skill と判定した対象にだけ付けるため。 |
| D003 | D001, D002 | 後続候補は今回の分類と metadata 実装の範囲から分離するため。 |
