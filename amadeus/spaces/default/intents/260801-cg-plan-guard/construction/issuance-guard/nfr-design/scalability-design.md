# Scalability Design — issuance-guard(U2)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- スケーラビリティは `business-logic-model.md` の入力規模(batch 数・unit 数は intent あたり最大 12 の実測 corpus)に接地する。

## スケーラビリティ設計

- 常駐サービス概念は非該当(nfr-design:c1)。判定は値渡しの純関数で、規模は線形にも達しない(単一 batch の照合)。

## 検証形

- 専用スケール検査は N/A(根拠: 上限 12 unit の決定的処理 — U1 の corpus 実測を参照、二重測定しない)。
