# Scalability Design — standing-grant(U1)

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜S-4)、`../nfr-requirements/scalability-requirements.md`(N/A 反証条件付き)、`../nfr-requirements/reliability-requirements.md`(RL-1〜RL-3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数構成)

## 判定: 根拠付き N/A(NR の判定を設計面で確認)

NR scalability-requirements の N/A(サービス実体なし・増加有界・分散協調なし)を設計でも維持 — スケール機構(キャッシュ・インデックス・並列走査)は**導入しない**(比例性 — 現況 intent 数十×シャード数個の grep 規模に対する最小実装)。再評価条件は NR 記載のとおり(発行頻度・intent 数の運用実測)。

## 導入しない機構の列挙(反証可能)

キャッシュ(決定性・鮮度管理の複雑化)/ インデックスファイル(shared-ledger 衝突面の新設)/ 並列走査(規模に不要)— いずれも再評価条件成立時に ADR で再検討する。
