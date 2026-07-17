# Performance Design — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: nfr-requirements(performance-requirements.md PR-U3-1/2)、U1 の nfr-design。

## 設計

- ビルド面は U1 機構の継承(emission table)。
- アダプタ(PR-U3-2): stdin 一括読み → 1回 parse → 1回写像 → 1回 spawn(pipe)の直列4ステップ — Cursor 側 timeout(hooks.json の timeout フィールド = 消費側の強制メカニズム)内に収まる最小構成。独自の性能数値・キャッシュ機構は設計しない

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
