# Reliability Design — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: nfr-requirements(reliability-requirements.md RL-U4-1〜3)、functional-design(business-rules.md R-U4-1/2/5)。

## 設計

- RL-U4-1: 落ちる実証は「dist の1ファイルを mv → smoke 赤を実測 → mv 戻し → 緑」の可逆手順(dist を汚さない)
- RL-U4-2: 機能表の各行に出典列(U2/U3 code-summary の節参照)を持たせる表構造 — 出典なし行が構造的に目立つ
- RL-U4-3: registry 再生成(gen-coverage-registry)→ tests --ci の FRESHNESS green を完了条件に直結

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
