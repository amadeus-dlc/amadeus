# Logical Components — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 論理構成(prose 配線 — 新規コードなし)

| 部品 | 所在 | 内容 |
|---|---|---|
| Claude invoke-swarm 節 | harness/claude/skills/amadeus/SKILL.md:61 近傍 | 三値 dispatch(resolve → Task 並列 / Dynamic Workflow / degrade / 停止) |
| Codex invoke-swarm 節 | harness/codex/skills/amadeus/SKILL.md:57,171 近傍 | headless floor 撤去 → native fan-out(spawn/回収/retry/wave) |
| Codex onboarding bullet | harness/codex/onboarding.fills.ts:55 | Swarm floor 記述の置換(:42/:81 は不変更 — U2 FD の精密化表) |
| Kiro/Kiro IDE 節 | harness/kiro*/skills+onboarding 各1 | 三値 degrade/fail-closed、旧 1 除去 |
| t181 拡張 | tests/unit/t181-conductor-skill-parity.test.ts | REQUIRED_TOKENS 追記(候補: resolve --harness / claude-ultra / codex-ultra / c2 固定文) |

## 配置

- 正本は harness 表層のみ(TSD-W2)。dist 反映は U3。テスト変更は t181(unit、fs 非接触の文字列検査)に閉じる
