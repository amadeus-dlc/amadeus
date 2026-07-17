# Security Test Instructions — answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): `../answer-tag-vocab-fix/code-generation/code-generation-plan.md`(検証列・統制)、`../answer-tag-vocab-fix/code-generation/code-summary.md`(出荷物・実測)。測定 ref: bolt head 66f8c885b(PR #1153、origin/main a4a33e59a 起点)。2026-07-17。

## 比例選定(build-and-test:c3)

- 監査整合性面(本修正の主目的): advisory 偽赤の解消は audit ノイズ低減 — fail-closed 面(gate-start ガード)は無改変で、E-OC1 証跡検査の実効性は不変(コロン形実答は従来どおり検査対象)
- fail→pass 偽陰性の残余(非コロン実答): corpus 0件を実測済み+発生源封鎖は FR-3 ノルム追補(norm PR 別経路)
- 依存追加なし: package.json 不変(diff 実測)

## 判定

新規攻撃面なし(反証可能根拠: 変更は収集正規表現の狭窄のみで、緩和方向の変更・新規入力面・権限面の変更ゼロ)。
