# B002: 暗黙起動ポリシー

## 概要

内部 skill の暗黙起動ポリシー設定対象と設定配置先を確認する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-internal-skill-policy-alignment/design.md)

## 完了条件

- 内部 skill と判定した対象に対して、Codex 向けの暗黙起動抑制設定を配置できるか確認されている。
- `policy.allow_implicit_invocation = false` の設定が、明示起動を維持しつつ暗黙起動を抑える目的として説明されている。
- Claude Code 側の同等設定の有無が確認されている。
- 同等設定が見つからない場合は、非対応理由または後続候補が記録されている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-*/agents/openai.yaml` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `.agents/skills/amadeus-*/agents/openai.yaml` | 未確認 | なし | 未確認 |
| IT005 | amadeus-dlc/amadeus | `CLAUDE.md` | 未確認 | なし | 未確認 |

## 未確認事項

- Claude Code 側の同等設定の有無。
- `agents/openai.yaml` を source skill と昇格先成果物のどちらへ先に配置するか。
