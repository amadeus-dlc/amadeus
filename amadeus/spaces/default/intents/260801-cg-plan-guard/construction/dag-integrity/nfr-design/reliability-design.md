# Reliability Design — dag-integrity(U1)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- 信頼性は `business-logic-model.md` の3アーム(dag/absent/invalid)の全数扱いに接地する。

## 信頼性設計

- 判別 union で無音経路を型的に排除(parse-don't-validate)— absent/invalid のどちらも「無視される undefined」にならない。
- 埋め込みフォールバックの二重保持なし(nfr-design:c3)— bolt_dag の正本は unit-of-work-dependency.md 1箇所、runtime-graph は投影。
- 回復経路: invalid → 計画訂正 → compile 再実行(逃し弁は計画訂正のみ、requirements 裁定2)。recoverBoltDag の既存 throw は無改変(NFR-2)。

## 検証形

- 信頼性の検証は FR-3 の AC(3a/3a2/3b/3c)と FR-6 の corpus sweep が引き受ける(専用の別検査を新設しない — 二重定義回避)。回復経路(計画訂正 → compile)は AC-3a2 の Green 側で実測される。
