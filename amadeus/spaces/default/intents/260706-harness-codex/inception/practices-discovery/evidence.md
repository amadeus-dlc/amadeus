# Evidence — 260706-harness-codex

## 上流入力

codekb 6 docs（基準 9dd93f50）を入力にした: [code-structure.md](../../../../codekb/amadeus/code-structure.md)、[technology-stack.md](../../../../codekb/amadeus/technology-stack.md)、[dependencies.md](../../../../codekb/amadeus/dependencies.md)、[code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)。

| 主張 | 証拠 |
|---|---|
| promote の agents 許可 | dev-scripts/promote-skill.ts 7 行目（alwaysAllowedDirs）実測 |
| parity checkSkills の範囲 | parity-check.ts checkSkills（engineer2 実測 L166-176）+ skills/amadeus-bugfix/agents/openai.yaml 仮置きで parity:check ok（engineer4、撤去済み） |
| 上流 dist/codex の実在と内容 | gh api で b67798c3 の tree / openai.yaml 内容を取得（guard = policy: allow_implicit_invocation: false） |
| Codex の skill 発見規則 | 上流 harness/codex/emit.ts 冒頭コメント（.agents/skills/ で発見） |
| PR 監視規律 | .agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md（#534 で新設、#549 で初実運用済み） |

## 検証方法

各証拠は実測（ファイル実在、行番号、コマンド実行結果）に基づく。再検証は該当ファイルの直読と gh api / parity:check の再実行で行える。
