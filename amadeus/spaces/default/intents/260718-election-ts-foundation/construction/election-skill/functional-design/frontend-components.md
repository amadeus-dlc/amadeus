# Frontend Components — election-skill(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## SKILL.md の利用者可視構造(これ自体が U6 の「UI」)

| 節 | 内容 |
|---|---|
| 起動 | next 呼出の1コマンド |
| 転送ループ | 指令 kind → 実行 → report の表 |
| 人間委譲 | hold 時の提示手順(AskUserQuestion 等ハーネス固有の委譲手段は書かず「人間へ提示」の中立記述 — contrib の投影先は promote-self.ts:45-46 実測で .claude/skills と .agents/skills の2箇所 = Claude/Codex 到達。Cursor/OpenCode は skills 概念を持たないため中立記述がより強く必要。reviewer m1 是正 — 旧「全ハーネス共有」は過大表現) |
| 終了 | done での記録パス報告 |

新規様式を発明せず、既存 contrib SKILL(amadeus-upstream-sync)の見出し様式に倣う。

## 様式の出典

見出し様式の写像元 = 既存 contrib SKILL(amadeus-upstream-sync)— 新規発明なし(ui-less-mockups-as-output-contract の既習様式準拠)。
