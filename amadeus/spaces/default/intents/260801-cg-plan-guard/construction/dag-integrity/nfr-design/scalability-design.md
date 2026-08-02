# Scalability Design — dag-integrity(U1)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- スケーラビリティは `business-logic-model.md` の対象データ規模(unit 数・batch 数は intent あたり高々数十)に接地する。

## スケーラビリティ設計

- CLI/ファイル境界の決定的処理であり常駐サービスの水平スケール概念は非該当(nfr-design:c1 — cache/scaling/circuit breaker を機械適用しない)。
- edge block の unit 数は実測 corpus で最大 12(260720-upstream-sync-230、全 record の parse 全数走査 — 測定 ref = 現 worktree HEAD) — 線形 parse で十分。ReDoS 面は既存 parser 無改変のため新規面なし。

## 検証形

- スケール面の専用検査は N/A(反証可能な根拠: 常駐サービス・水平スケール・外部負荷源のいずれも不在 — nfr-design:c1)。データ規模の上限挙動は corpus 実測(38 record の parse 全数)で代替済み。
