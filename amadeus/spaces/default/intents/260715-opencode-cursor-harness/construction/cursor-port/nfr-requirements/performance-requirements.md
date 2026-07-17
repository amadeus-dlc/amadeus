# Performance Requirements — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)。

## 要件

- PR-U3-1: ビルド時間は U1/U2 と同一特性(線形増分)— 専用目標値なし(nfr-requirements:c3)
- PR-U3-2: アダプタ(amadeus-cursor-adapter.ts)は hook 発火ごとの単発プロセス — 処理は stdin parse+写像+pipe のみで、性能目標は Cursor 側の hook timeout(hooks.json の timeout フィールド — 消費側の強制メカニズム)を上限とし、独自数値を発明しない

## N/A(反証可能根拠付き)

- 実行時性能 SLO: N/A — アダプタは advisory hook で SLI を持たない(fail-open 契約)
