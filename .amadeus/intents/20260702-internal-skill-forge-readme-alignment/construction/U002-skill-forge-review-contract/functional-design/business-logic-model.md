# Business Logic Model

## 目的

`skill-forge` の確認範囲と source skill / 昇格先成果物の整合確認を定義する。

## 対象 Unit

U002 skill-forge review contract。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | `skill-forge` の確認観点を trigger description、skill 本文、eval、Codex metadata、昇格先成果物に分ける。 | `skill-forge`、対象 skill | Skill Forge Review Scope | R002, UC002 |
| BL002 | README 分類に基づいて、確認対象の source skill と昇格先成果物を決める。 | Skill Role Classification、skill 一覧 | Review Target Set | R002, R003 |
| BL003 | source skill と昇格先成果物の差分確認、昇格手段、検証入口を整理する。 | Review Target Set、package scripts | Promotion And Validation Plan | R003, UC003 |
| BL004 | README 更新後に skill 契約、validator、example、検証入口とのずれがないか確認する。 | README 差分、Review Target Set | Consistency Verification Plan | R005, UC004 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| `skill-forge` | skill 境界、trigger description、本文、eval、metadata を確認する作業手順。 | R002 |
| source skill | `skills/amadeus-*` にある変更元。 | R003 |
| 昇格先成果物 | `.agents/skills/amadeus-*` にある利用対象。 | R003 |
| 検証入口 | `package.json` の検証 script と validator。 | R005 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Skill Forge Review Scope | 今回実行する skill-forge 確認観点。 | B002 |
| Review Target Set | 確認対象の source skill と昇格先成果物。 | B003 |
| Promotion And Validation Plan | 昇格手段と検証入口。 | B003, B004 |
| Consistency Verification Plan | README と skill 契約の整合確認条件。 | B004 |

## 未確認事項

なし。
