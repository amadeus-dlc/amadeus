# Tech Stack Decisions — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)、application-design decisions.md(ADR-1)。

## 決定

- TS-U2-1: U1 の TS-U1-1〜5 を全継承(新規スタック要素ゼロ)
- TS-U2-2: opencode.json.example は JSON 厳密(JSONC 不可 — R-U2-2、E-CS1 Q2 と同判断の再適用)

## 代替検討

新規要素なしのため N/A(TS-U2-2 の代替 = JSONC は R-U2-2 で棄却済み)。
