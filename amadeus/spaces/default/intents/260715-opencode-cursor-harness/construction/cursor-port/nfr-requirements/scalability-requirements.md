# Scalability Requirements — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)。

## 要件

- SC-U3-1: ToolNameMap はモジュールスコープ定数で、語彙追加は1エントリ追記(実測を伴う — R-U3-1)
- SC-U3-2: hooks.json のイベント追加は table 追記のみ(構造変更不要)

## N/A(反証可能根拠付き)

- 負荷スケーリング: N/A — hook は利用者ローカルの単発プロセス
