# Scalability Design — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: nfr-requirements(scalability-requirements.md SC-U3-1/2)。

## 設計

- SC-U3-1: ToolNameMap は Readonly<Record> 1定数 — 語彙追加は1行+実測記録
- SC-U3-2: hooks.json.example の生成はイベント表(実測確定分)からの導出 — イベント追加は表1行

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
