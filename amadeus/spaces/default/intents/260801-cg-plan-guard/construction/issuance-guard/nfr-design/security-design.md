# Security Design — issuance-guard(U2)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- セキュリティ面は `business-logic-model.md` の fail-closed 既定(列挙外 = violation)が認可・ゲート面を強める方向であることに接地する。

## セキュリティ設計

- 逃し弁は計画訂正のみ — env スキップ・実行時 verb を新設しない(検証劇場 Forbidden の予防、requirements 裁定2)。
- ガードメッセージに秘密情報を含めない(unit 名・幅・ファイル名・コマンド名のみ)。
- 認可バイパス経路なし: violation は engine の error directive であり、approve 側の既存 human-presence/workspace_requires ガードを迂回しない。

## 検証形

- 新規セキュリティ検査は N/A(反証可能な根拠: 攻撃面・依存・秘密の3面とも変化なし)。fail-closed 既定は AC-1a 系の落ちる実証が引き受ける。
