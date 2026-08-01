# Scalability Design — approve-reconciliation(U3)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- スケーラビリティは `business-logic-model.md` の対象規模(batch ≤ 12、シャード数は clone 数オーダー)に接地する。

## スケーラビリティ設計

- 常駐概念なし(nfr-design:c1)。audit シャード走査は approve 経路への新規追加1箇所(performance-design の精密化どおり)だが、コスト構造は他所で既に常用される readAllAuditShards と同一で、有界(batch ≤12)。

## 検証形

- 専用スケール検査は N/A(根拠: 既存読取の再利用で入力規模の上限も既存と同一)。
