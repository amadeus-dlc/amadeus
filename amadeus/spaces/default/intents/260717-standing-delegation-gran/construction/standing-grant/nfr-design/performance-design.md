# Performance Design — standing-grant(U1)

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜S-4)、`../nfr-requirements/scalability-requirements.md`(N/A 反証条件付き)、`../nfr-requirements/reliability-requirements.md`(RL-1〜RL-3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数構成)

## 設計

- P-1 実現: 走査は「intents/*/audit/*.md の1周+行 parse」に限定(再帰なし・キャッシュなし — 決定性優先)。呼び出しは humanActedSinceGate false 経路のみ(P-2)
- P-2 実現: 従来 pass 経路(HUMAN_TURN あり/delegate あり)ではグラント走査ゼロ — 挿入位置(ADR-7)が構造保証

## 保証機構(層別)

seam 層 = 呼び出し頻度の限定 / verifier 層 = 走査域の限定 / テスト層 = ランナー予算内完走の実測(専用ベンチ・SLO なし — NR P-1 の非 SLO 整理)。
