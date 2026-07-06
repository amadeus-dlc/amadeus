# Constraint Register：260704-v2-parity-completion

## 交渉不能な制約

| 制約 | 種別 | 根拠 |
|---|---|---|
| C001: 既存の開発環境（kiro skill 群、既存 hooks、dev-scripts、既存 validator）を壊さない。上流の hook と settings は aidlc-* 名前空間で既存 `settings.json` へマージする | 既存アーキテクチャ | feasibility Q1 の人間回答 |
| C002: main は常に `npm run test:all` green を維持し、置換は Bolt 単位の PR に分割する。粒度制約の例外は理由と後続確認先を記録して使う | 既存アーキテクチャ | feasibility Q2 の人間回答、`memory/team.md` の判断基準 |
| C003: パリティ検査の基準は上流 commit `fde1e1af7aae16f4c4defc991abaa3877ee2ac26` に固定し、成果物に記録する。上流への追従は差分確認を経た明示的な Issue または Intent で行い、自動追従しない | 対象外 | feasibility Q3 の人間回答 |
| C004: SKILL.md と TS スクリプトは英語必須とする。記述系成果物とユーザー向け gate 文言は日本語を維持する | コンプライアンス | G001 の GD002 |
| C005: amadeus-grilling、amadeus-domain-modeling、amadeus-validator の機能を失わない。コピーした skill とエンジンの質問提示は amadeus-grilling へ結線する | 既存アーキテクチャ | G001 の GD001、GD003 |
| C006: merge 操作は人間が行い、walking skeleton の Bolt PR は必ず人間が承認する | コンプライアンス | `memory/team.md`、lifecycle 契約 |
