# Discovered Rules — 260706-harness-codex

## 上流入力

codekb 6 docs（基準 9dd93f50）を入力にした: [code-structure.md](../../../../codekb/amadeus/code-structure.md)、[technology-stack.md](../../../../codekb/amadeus/technology-stack.md)、[dependencies.md](../../../../codekb/amadeus/dependencies.md)、[code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)。

## 本 Intent に効く規則（発見分）

1. promote は skill ディレクトリを丸ごと置換する（alwaysAllowedDirs = references / scripts / assets / templates / agents）。openai.yaml は "agents" 許可により正規に昇格対象になる（実測済み、feasibility）。
2. parity の checkSkills は skill ディレクトリの存在確認のみで、skill 内ファイルの hash 照合をしない（engineer2 実測 L166-176 + engineer4 の仮置き実測）。新規 openai.yaml は parity:check に乗らない。
3. skill 言語方針の英語必須対象は SKILL.md と TS スクリプトであり、yaml 設定ファイルは対象外（docs/amadeus/skill-language-policy.md）。ただし受け入れ条件として「誤って検査対象に乗らないこと」を requirements で明文化する（engineer5 提案）。
4. rename-leftovers eval は旧名（aidlc）残存の検出器である。上流 yaml の取り込みで aidlc 表記を持ち込まないこと（rename 契約の適用対象）。
