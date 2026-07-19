# Logical Components — election-skill(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md

## 構成要素

| コンポーネント | 責務 | 公開面 |
|---|---|---|
| `contrib/skills/amadeus-election/SKILL.md` | 転送ループの薄記述(4節構造 — business-rules.md BR-K3)。配置典拠は ADR-1(U-01=B)+FR-8a の contrib overlay 実測 | SKILL 本文のみ(references/evals/agents 補助ディレクトリなし — nfr-requirements 段の精密化どおり) |
| 検査テスト(tests/ 配下) | 禁止語彙 grep(BR-K1)+4節構造検査(BR-K3)+委譲文実在(BR-K4)+vacuity guard(BR-K2) | テストのみ(本番コードなし — 検査対象は tracked 固定ファイルのため integration 層。business-rules.md BR-K1 のテスト列) |
| 実演手順(build-and-test 時) | ノルム無参照 subagent への SKILL+ツールパス供給・記録保存(business-logic-model.md 実演層) | record 成果物1点(非 CI) |

- U6 は実行コードを持たない(performance-requirements.md/scalability-requirements.md の N/A 根拠と一体)。検査の信頼性は reliability-design.md の両側 fixture 設計、語彙境界は security-design.md の canonical 定数に従う(tech-stack-decisions.md の選定と一体)
- 依存方向: U6 → U5 のみ(unit-of-work-dependency.md:14 — SKILL は CLI の指令ループを転送するだけ。構造行 :29)

## テスト配置

- integration 層(SKILL.md の実ファイル read — business-rules.md BR-K1 のテスト列注記どおり)
