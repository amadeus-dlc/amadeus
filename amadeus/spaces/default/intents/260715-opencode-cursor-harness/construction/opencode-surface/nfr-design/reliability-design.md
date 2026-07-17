# Reliability Design — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: nfr-requirements(reliability-requirements.md RL-U2-1/2)、U1 の nfr-design(reliability-design.md)。

## 設計

- RL-U2-1: U1 の emissionTable(ctx) 構造へのエントリ追加のみ(構造 diff ゼロをレビューで実測 — R-U2-1)
- RL-U2-2: 未置換トークン検出は dist 生成後の grep(検証コマンド列に追加)— 黙殺経路なし

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
