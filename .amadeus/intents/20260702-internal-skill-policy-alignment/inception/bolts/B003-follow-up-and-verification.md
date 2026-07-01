# B003: 後続候補と検証証拠

## 概要

Issue #284 のうち対象外に分けた作業と、今回の検証証拠を記録する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-internal-skill-policy-alignment/design.md)

## 完了条件

- `skill-forge` 監査を後続候補にする理由が記録されている。
- `SKILL.md` 英語化を後続候補にする理由が記録されている。
- Discovery 候補 ID の改善候補を、この Intent の成功条件に混ぜず後続候補として扱っている。
- validator、diff check、必要な設定検証の結果を PR 説明または Construction 成果物に記録できる。

## 依存

- B001
- B002

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT006 | amadeus-dlc/amadeus | `.amadeus/intents/20260702-internal-skill-policy-alignment/construction/**` | 未確認 | なし | 未確認 |
| IT007 | amadeus-dlc/amadeus | `PR description` | 未確認 | なし | 未確認 |

## 未確認事項

- 後続候補を GitHub Issue として作成するか。
- `skill-forge` 監査と `SKILL.md` 英語化を同じ後続 Issue にするか分けるか。
