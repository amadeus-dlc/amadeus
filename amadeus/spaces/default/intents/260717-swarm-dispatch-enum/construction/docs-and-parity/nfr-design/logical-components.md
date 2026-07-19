# Logical Components — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 論理構成(文書・生成物のみ — 新規コードなし)

| 部品 | 所在 | 内容 |
|---|---|---|
| driver seam 表 | docs/harness-engineering/08-construction-and-swarm.md:201-213 | 三値 16 セル表(4 harness 列 — BR-D1 形状)+opencode/cursor 1 行 |
| skill-system §6 | docs/reference/17-skill-system.md:122(+:116 の旧語彙) | 三値 normative 契約へ置換 |
| 監査語彙 2 行 | docs/reference/12-state-machine.md:367(+.ja)/ core knowledge audit-format.md:202 | 三値後の事実文へ |
| harness ガイド | docs/guide/harnesses/{codex-cli,kiro-cli,kiro-ide}(.md/.ja.md) | 各 harness 列の転記+C-15 開示(codex) |
| 生成物 | dist/×6+self-install | package.ts / promote:self 再生成のみ |

## 配置

- 手書き対象は写像表の列挙ファイルのみ。dist は生成(手書き 0)。テスト変更なし(docs gate 系は既存のまま — 破損時のみ対応 = 実測駆動)
