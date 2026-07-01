# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | README に載せる公開入口 skill、横断的補助 skill、内部 skill の分類を、実際の `amadeus-*` skill 一覧と照合できる。 | 採用済み | なし | [R001-readme-skill-role-inventory.md](requirements/R001-readme-skill-role-inventory.md) |
| R002 | `skill-forge` で確認する観点を、trigger description、skill 本文、eval、Codex metadata、昇格先成果物に分けて判断できる。 | 採用済み | R001 | [R002-skill-forge-review-scope.md](requirements/R002-skill-forge-review-scope.md) |
| R003 | source skill と昇格先成果物の差分確認、昇格手段、検証入口を追跡できる。 | 採用済み | R001, R002 | [R003-source-promoted-artifact-alignment.md](requirements/R003-source-promoted-artifact-alignment.md) |
| R004 | 互換性維持対象が明示されていない場合に、旧入口、旧名、alias、互換層を追加しない判断を説明できる。 | 採用済み | R001 | [R004-compatibility-boundary.md](requirements/R004-compatibility-boundary.md) |
| R005 | README を更新する場合に、skill 契約、validator、example、検証入口とのずれを残さない確認条件を説明できる。 | 採用済み | R002, R003, R004 | [R005-validation-and-readme-consistency.md](requirements/R005-validation-and-readme-consistency.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | README と実際の skill 一覧の関係が、後続確認の前提であるため。 |
| R002 | R001 | skill-forge の確認範囲は、確認対象の skill 分類を前提に決めるため。 |
| R003 | R001, R002 | source skill と昇格先成果物の確認対象は、README 分類と skill-forge 確認観点を前提に決めるため。 |
| R004 | R001 | 互換性判断は、README の分類と公開入口の扱いを前提にするため。 |
| R005 | R002, R003, R004 | README 更新後の確認条件は、skill-forge 確認、昇格先成果物、互換性判断を前提にするため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |
