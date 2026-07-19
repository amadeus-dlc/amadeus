# Code Summary — election-skill(Bolt 5)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## 生成物(PR #1236)

| ファイル | 内容 | 検証 |
|---|---|---|
| `contrib/skills/amadeus-election/SKILL.md` | 4節転送ループ(起動/転送/人間委譲/終了 — business-rules.md BR-K3)。指令の verb/report を字義実行、判断点は全て人間委譲(BR-K4)。規則語彙ゼロ(requirements.md FR-8a/FR-0、security-design.md の語彙境界) | t242 integration 5テスト(禁止語彙 sweep+落ちる実証+vacuity guard — reliability-design.md の両側実測、4節 exact pin、委譲文検査) |
| self-install 投影(.claude/skills+.agents/skills) | promote:self 実行(logical-components.md の到達2経路) | promote:self:check exit 0 |

## Bolt 完了状態

- U6 の CI 面完了(bolt-plan.md Bolt 5)。実演層(ノルム無参照 subagent 1回 — business-logic-model.md ADR-6 (ii))は build-and-test で実施予定。検証実測は PR #1236 本文(performance-design.md の検証設計どおり実行コードなし = patch 対象 0 行)
