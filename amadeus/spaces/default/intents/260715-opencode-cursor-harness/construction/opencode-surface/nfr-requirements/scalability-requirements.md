# Scalability Requirements — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)。

## 要件

- SC-U2-1: skills 合成は将来の skill 追加に対し emit 関数の table 追記のみで拡張可能(構造変更不要 — R-U2-1 の帰結)

## N/A(反証可能根拠付き)

- 負荷スケーリング: N/A — U1 と同一根拠
