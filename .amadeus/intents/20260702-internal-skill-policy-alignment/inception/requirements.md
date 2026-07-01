# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | README の Internal Skills 一覧が、現在の内部 skill 構成と照合されている。 | 採用済み | なし | [R001-internal-skills-readme-alignment.md](requirements/R001-internal-skills-readme-alignment.md) |
| R002 | 内部 skill と公開入口 skill の判断基準を追跡できる。 | 採用済み | R001 | [R002-internal-skill-classification.md](requirements/R002-internal-skill-classification.md) |
| R003 | 内部 skill の暗黙起動ポリシー設定対象が整理されている。 | 採用済み | R002 | [R003-implicit-invocation-policy-targets.md](requirements/R003-implicit-invocation-policy-targets.md) |
| R004 | Codex と Claude Code の設定配置先が確認されている。 | 採用済み | R003 | [R004-codex-claude-configuration-placement.md](requirements/R004-codex-claude-configuration-placement.md) |
| R005 | `skill-forge` 監査と `SKILL.md` 英語化を後続候補として分離する理由が追跡できる。 | 採用済み | R001 | [R005-follow-up-scope-separation.md](requirements/R005-follow-up-scope-separation.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | README 一覧の現状確認が、後続判断の入口であるため。 |
| R002 | R001 | 内部 skill 判定は、README 一覧と実際の skill 構成の差分を前提にするため。 |
| R003 | R002 | 暗黙起動ポリシーは、内部 skill と判定した対象に適用するため。 |
| R004 | R003 | 設定配置先の確認は、適用対象と設定値の判断を前提にするため。 |
| R005 | R001 | 後続候補の分離は、Issue #284 の範囲全体と今回の README 整合範囲を比較するため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 提案 | 未登録 |
| R002 | 提案 | 未登録 |
| R003 | 提案 | 未登録 |
| R004 | 提案 | 未登録 |
| R005 | 提案 | 未登録 |
