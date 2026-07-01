# U001: 内部 skill ポリシー整合

## ユニット

内部 skill 一覧と暗黙起動ポリシーを同じ分類判断で整合させる。

## 対象要求

- R001
- R002
- R003
- R004
- R005

## 価値境界

- README の Internal Skills 一覧と、内部 skill の暗黙起動ポリシー設定対象を同じ分類判断で扱う。
- Codex と Claude Code の設定配置確認を、対象範囲の一部として扱う。
- `skill-forge` 監査と `SKILL.md` 英語化は、この Unit の価値境界から外す。

## 検証観点

- README の英語版と日本語版で Internal Skills 一覧が対応している。
- 内部 skill 判定が source skill と昇格先成果物の構成に基づいている。
- 暗黙起動ポリシー設定対象が、内部 skill 判定と一致している。
- Codex と Claude Code の設定確認結果が記録されている。
- 対象外候補が PR 説明または `.amadeus/` 成果物から追跡できる。

## 未確認事項

- Claude Code 側の同等設定が存在するか。
- `agents/openai.yaml` を追加する場合、source skill と昇格先成果物のどちらを生成元として扱うか。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `README.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `README.ja.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-*/agents/openai.yaml` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `.agents/skills/amadeus-*/agents/openai.yaml` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-internal-skill-policy-alignment/design.md)
