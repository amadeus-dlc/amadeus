# Frontend Components — election-cli(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 出力契約(ui-less-mockups-as-output-contract — U5 が CLI 面の所有者)

| 経路 | stdout | stderr | exit |
|---|---|---|---|
| next(通常) | 指令 JSON 1行 | (advisory 任意) | 0 |
| next(hold) | hold 指令 JSON(reason+提示文) | — | 0(指令発行自体は成功) |
| report(整合) | `{"committed": …}` | — | 0 |
| report(不整合) | — | `{"error": "invalid-transition …"}` | 1 |
| 各 verb 成功/失敗 | JSON / — | — / `{"error": …}` | 0 / 1 |
| 未知 verb・引数不足 | — | usage 1行 | 1 |

既存兄弟様式(amadeus-orchestrate/amadeus-mirror の stdout=JSON・exit 0/1)に揃え新規様式を発明しない。

## 指令の人間可読性

hold 指令の提示文は「理由+人間が選べる選択肢」を1段落で含む(AI は転送のみ — C-01 の可視面)。
