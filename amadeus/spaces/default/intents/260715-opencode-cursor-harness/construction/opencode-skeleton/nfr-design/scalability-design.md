# Scalability Design — U1 opencode-skeleton

intent: 260715-opencode-cursor-harness / Unit: U1
上流入力: nfr-requirements(scalability-requirements.md SC-U1-1/2)。

## 設計

- SC-U1-1: 拡張点は emission table への追記のみ(U2 が実証する構造)— 新規スケーラビリティ機構なし
- SC-U1-2: dist サイズの実測記録は code-summary の定型節(du -sh dist/opencode/ の1行)で実現

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
