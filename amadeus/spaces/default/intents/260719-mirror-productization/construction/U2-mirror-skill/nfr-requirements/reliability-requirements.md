# Reliability Requirements — U2-mirror-skill

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## RL-U2-1: ツール不在時の挙動

配布面で {{HARNESS_DIR}}/tools/amadeus-mirror.ts が不在(異常インストール)の場合、bun の実行エラーがそのまま loud に出る — SKILL 側でエラーを飲む案内を書かない。

## RL-U2-2: ドリフト防御

SKILL と実 verb 集合の乖離(verb 追加・exit 契約変更)は dist:check/promote:self:check+FR-3 受け入れ基準 (b)(c) の grep 検査で検出(technology-stack.md の既存 drift guard 構成に相乗り)。
