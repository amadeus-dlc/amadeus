# Performance Design — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: nfr-requirements(performance-requirements.md PR-U2-1/2)、U1 の nfr-design(performance-design.md — 機構継承元)。

## 設計

U1 の機構(emission table iterate、新規機構なし)をエントリ追加で継承。skills 合成はファイル列挙+コピー合成(件数線形)。専用検証機構なし(PR-U2-1 の帰結)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
