# Security Design — dag-integrity(U1)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- セキュリティ面は `business-logic-model.md` の fail-closed 強化(無音 degrade の封鎖)が監査整合性(NFR-1 系)へ寄与する方向であることに接地する。

## セキュリティ設計

- 攻撃面の新設なし: 入力は repo 内ファイル(edge block)と state のみ。外部入力・認証情報の取り扱いなし。
- fail-closed 方向のみ: invalid で throw(exit 非ゼロ)は検証を強める側 — 認可バイパス・ガード緩和の経路を作らない。エラーメッセージに秘密情報を含めない(パスと parse detail のみ)。

## 検証形

- 対象変更に新規セキュリティ検査は N/A(反証可能な根拠: 攻撃面・依存・秘密の3面すべて変化なし — bt-proportional-selection)。
