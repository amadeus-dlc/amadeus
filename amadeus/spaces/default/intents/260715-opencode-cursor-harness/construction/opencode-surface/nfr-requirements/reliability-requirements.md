# Reliability Requirements — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(エラーモデル継承)。

## 要件

- RL-U2-1: U1 のエラーモデル(fail-fast / write⇔check / 冪等 dist:check)を変更なしで継承(R-U2-1)
- RL-U2-2: トークン置換の失敗(未置換残存)は R-U2-3 の grep で検出 — 黙殺経路なし

## N/A(反証可能根拠付き)

- 可用性 SLO 等: N/A — U1 と同一根拠
