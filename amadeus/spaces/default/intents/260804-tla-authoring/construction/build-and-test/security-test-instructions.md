# Security Test Instructions — 260804-tla-authoring

上流入力(consumes 全数): 各 unit の code-generation-plan.md(fail-closed 契約)と code-summary.md(拒否経路の実測)。

## 工程統制の検証(nfr-design security-design.md の NFR 面)

- 承認 provenance の二重照合: U2 buildReceipt(BR-U2-24 偽装負例)と U4 commit(BR-U4-15 provenance 偽装 fixture)の red 実証済みテストが owning test(t444 / t448-t449)
- reviewer 独立性: reviewer = modelAuthor / 空文字を reviewer-not-independent で拒否(t448 実測)
- fail-closed 全数: 拒否経路(stale / provenance 偽装 / bundle 不一致 / concurrent-modification / shard 不読 / io-failure)を typed failure で loud 拒否、旧 map バイト無傷(t449 実測)
- E2E の統制点: referee typed failure の halt / 承認欠落の登録拒否(t450 fail-closed 2系)

## 依存監査の分離判定

対象変更のセキュリティ回帰(上記)と repo 全体の依存監査は別判定(既定ノルム)。本 intent は新規 runtime 依存ゼロ(Bun-only 前提不変)・新規ネットワーク経路ゼロ(TLC 実行は network=none の Docker)。
