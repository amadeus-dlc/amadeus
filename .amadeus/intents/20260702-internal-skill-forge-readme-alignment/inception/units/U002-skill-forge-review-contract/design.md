# Unit Design Brief: skill-forge 確認契約

## 概要

この文書は U002 の Unit Design Brief である。

Inception では、`skill-forge` の確認範囲、source skill と昇格先成果物の整合、検証入口を整理し、Construction で Task 化するための入力を扱う。

詳細な review 手順、eval 実行、metadata 生成、昇格処理は Construction で確定する。

## 設計戦略

`skill-forge` の確認観点を一括作業として扱わず、trigger description、skill 本文、eval、Codex metadata、昇格先成果物に分ける。

README 分類で確認対象になった skill について、source skill と昇格先成果物のどちらを確認するか、昇格が必要か、どの検証入口を使うかを Construction で判断できるようにする。

## 責務境界

所有するもの:

- `skill-forge` の確認観点の分解。
- source skill と昇格先成果物の対応確認。
- 昇格手段と検証入口の整理。
- README 更新後の skill 契約との整合確認。

所有しないもの:

- `skill-forge` 本体の変更。
- 全 `amadeus-*` skill の一括リライト。
- eval workflow の無条件実行。
- Codex metadata の無条件生成。

依存してよいもの:

- U001 の README skill 分類。
- `skill-forge` の確認手順。
- steering policy の source skill と昇格先成果物の分離方針。
- `package.json` の検証入口。

後続で再確認が必要になる条件:

- Codex metadata が存在せず、新規生成が必要になる場合。
- eval workflow が高コストで、この Intent の範囲を超える場合。
- source skill と昇格先成果物に想定外の差分がある場合。

## 構成候補

| 構成候補 | 役割 |
|---|---|
| Review scope | skill-forge の確認観点を分類する。 |
| Source/promoted check | source skill と昇格先成果物の差分を確認する。 |
| Promotion path | 昇格が必要な場合の手段を確認する。 |
| Validation plan | contracts、promote-skill、validator、diff check などの検証候補を整理する。 |

## データと契約候補

| 種別 | 候補 |
|---|---|
| 入力候補 | U001 の分類結果、`skill-forge`、`skills/amadeus-*`、`.agents/skills/amadeus-*`、`package.json`。 |
| 出力候補 | 確認範囲、必要な skill 更新、昇格結果、検証結果、PR 記録。 |
| 状態候補 | 要求の採用済み、Construction Task の完了、受け入れ状態の検証済み。 |
| 事前条件候補 | README の skill 分類が確認済みである。 |
| 事後条件候補 | skill-forge の確認範囲と検証入口を説明できる。 |
| 不変条件候補 | README だけを更新して skill 契約や昇格先成果物とのずれを残さない。 |

## 検証観点

- skill-forge の確認観点が分解されている。
- source skill と昇格先成果物の確認対象が明確である。
- 昇格が必要な場合の手段が steering policy と矛盾しない。
- README、skill 契約、validator、example への影響確認が記録されている。

## Bolt 分割方針

- B002 は skill-forge review scope を扱う。
- B003 は source skill と昇格先成果物の整合を扱う。
- B004 は検証条件と README 整合の最終確認を扱う。

## Construction への引き継ぎ

- Functional Design では、skill-forge 確認範囲、metadata の扱い、eval の扱いを確定する。
- Task Generation では、review scope、source/promoted 差分確認、昇格要否、検証を Task 化する。
- 実装では、必要な範囲だけ README、skill、metadata、eval、昇格先成果物を更新する。
- 検証では、対象 Intent validator、`contracts:check`、`test:it:promote-skill`、必要な README / skill text contract を実行候補にする。
