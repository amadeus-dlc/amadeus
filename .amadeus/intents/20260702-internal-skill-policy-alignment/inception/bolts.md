# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | README と内部 skill 分類を整合させる。 | U001 | [design.md](units/U001-internal-skill-policy-alignment/design.md) | なし | [B001-readme-internal-skill-catalog.md](bolts/B001-readme-internal-skill-catalog.md) |
| B002 | 内部 skill の暗黙起動ポリシー設定と配置確認を行う。 | U001 | [design.md](units/U001-internal-skill-policy-alignment/design.md) | B001 | [B002-implicit-invocation-policy.md](bolts/B002-implicit-invocation-policy.md) |
| B003 | 後続候補分離と検証証拠を記録する。 | U001 | [design.md](units/U001-internal-skill-policy-alignment/design.md) | B001, B002 | [B003-follow-up-and-verification.md](bolts/B003-follow-up-and-verification.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | README 一覧と内部 skill 分類が後続設定の入力になるため。 |
| B002 | B001 | 暗黙起動ポリシーは内部 skill と判定した対象に適用するため。 |
| B003 | B001, B002 | 後続候補分離と検証証拠は README と設定確認の結果を前提にするため。 |
