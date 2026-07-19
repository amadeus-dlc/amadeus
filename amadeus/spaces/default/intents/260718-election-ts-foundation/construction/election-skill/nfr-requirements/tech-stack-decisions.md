# Tech Stack Decisions — election-skill(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 選定と根拠

| 領域 | 選定 | 根拠 |
|---|---|---|
| SKILL 配置 | `contrib/skills/amadeus-election/SKILL.md` | ADR-1(U-01=B 裁定)+requirements.md FR-8a の contrib overlay 実測(promote-self.ts:45-46)。amadeus-upstream-sync 前例と同配置(実測: 前例は SKILL.md+references/・evals/・agents/ の補助ディレクトリを伴うが、U6 は SKILL.md 単体で足りる設計 — reviewer Minor の精密化) |
| 検査実装 | bun test 内の決定的 grep(禁止語彙集合は business-rules.md の canonical 1定義から導出) | requirements.md FR-8a 受け入れ (i)+construction ガードレール(canonical 1定義 — 複数箇所の手書き複製禁止)。決定的関数の直接適用であり LLM fan-out を使わない(deterministic-function-direct-sweep) |
| 実演層 | ノルム無参照 subagent への SKILL+ツールパスのみの供給(1回・非 CI) | ADR-6 (ii) — FR-0 受け入れ基準の「fresh なセッション断面」文言の直接証跡。技術追加なし(既存 Task/subagent 機構) |
| lint/型検査 | 検査テストは既存 Biome+tsc 配線(SKILL.md 自体は md — lint 対象外) | ADR-1 Consequences。新規配線なし(technology-stack.md の既存 CI gate 列) |

## 却下した代替

- SKILL 用の専用 linter/スキーマ検証ツールの新設 — 検査対象は禁止語彙と構造契約(FR-8a (ii) の required-sections 型チェック)のみで、bun test 内 grep で足りる(規模正当化 — 既存で代替できない根拠なし)
- LLM による SKILL 本文の意味論検査 — 非決定的で CI に置けず(NFR-3 と不整合)、grep 検査+構造チェックで受け入れ基準を充足できるため不採用
