# Performance Design — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: nfr-requirements(performance-requirements.md PR-U4-1)。

## 設計

smoke は fs.existsSync / readFileSync の直読のみ(spawn ゼロ)— 4層ランナーの smoke 層予算内。統合検証は fan-out 収束後に実行(fanout-load-settle-before-integration の運用適用)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
