# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | steering policy の概要と個別 policy への導線を記録する。 | U001 | [design.md](units/U001-git-branching-policy/design.md) | なし | [B001-policy-placement.md](bolts/B001-policy-placement.md) |
| B002 | Git branch lifecycle の具体ルールを記録する。 | U001 | [design.md](units/U001-git-branching-policy/design.md) | B001 | [B002-branch-lifecycle-rules.md](bolts/B002-branch-lifecycle-rules.md) |
| B003 | policy 参照方針と検出境界を記録する。 | U002 | [design.md](units/U002-policy-traceability-validation/design.md) | B001, B002 | [B003-policy-reference-validation.md](bolts/B003-policy-reference-validation.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | policy の配置と導線は具体ルールの前提であるため。 |
| B002 | B001 | branch lifecycle ルールは個別 policy の配置を前提にするため。 |
| B003 | B001, B002 | policy 参照と検出境界は、配置済み policy と具体ルールを前提にするため。 |
