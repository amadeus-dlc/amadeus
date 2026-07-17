# Performance Requirements — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)。

## 要件

- PR-U2-1: emission table のエントリ増(AGENTS.md / opencode.json.example / skills)によるビルド時間増は U1 同様の線形増分 — 専用目標値は設けない(nfr-requirements:c3 — 強制メカニズム不在)
- PR-U2-2: skills 合成のファイル数は codex 前例(orchestrator+session skills)と同規模 — 実測値を code-summary に記録

## N/A(反証可能根拠付き)

- 実行時性能 SLO: N/A — U1 と同一根拠(静的配布物、runtime service 不在)
