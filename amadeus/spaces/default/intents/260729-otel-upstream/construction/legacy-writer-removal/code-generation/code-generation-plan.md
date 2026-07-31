# Code Generation Plan — legacy-writer-removal

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements（performance / reliability / scalability / security / tech-stack-decisions）、nfr-design（logical-components / performance / reliability / scalability / security）（すべて参照済み）

## 対象要件

U8（unit-of-work.md）: 削除ゲート全6条件の機械検証を通過し、旧 writer が削除される。

## 前提裁定と着地形

- **E-U8PRE**（2026-07-30、tie 裁定 = 複合方針B）: U8 着手前の前提として pre-U8 Bolt P1（再入 audit lock `enterAuditLock`/`exitAuditLock` + per-call emit ターゲティング）を先行実施。PR #1755 として着地済み。
- **ユーザー裁定（2026-07-31）**: 削除ゲートの機械評価が BLOCKED（(c) 66 call site 残存 / (d)(e) UNKNOWN）のため、本 Bolt は**ゲートのみで PR 化**し、旧 writer 本体の削除はゲート GREEN 成立後の後続 Bolt へ送る。66 call site 移行（U7 DoD 未達分）は追加 Bolt として編成。retention 条件 = 「削除ゲート全6条件 GREEN」と定義。実行時間 ratchet は見送り承認。

## 実施方針

- 六条件削除ゲート `tests/deletion-gate.ts`: (a) mixed Journal 動作（t365/t366）/(b) registry 完備/(c) 直接 call site ゼロ/(d) shadow 比較同等（--shadow-report 供給）/(e) Relay 非生成証明（FR-RLY-2 マーカー）/(f) distribution guards。
- 判定不能は UNKNOWN で PASS にしない（BR-12）。argv からの強制 PASS 経路なし（BR-2）。report は書込前スキーマ検証+credential 形状拒否（BR-16）。
- `--check` = 評価成功で exit 0（移行期間中 BLOCKED は正常）/ `--require-green` = 削除前提条件、GREEN 以外 exit 1。
- CI（lint ジョブ）に gate step + report artifact upload を追加。
- TDD（Red 実測 → 最小実装 → Green の vertical slice、落ちる実証は両アーム実測）。

## 検証計画

- t371 系（unit + integration）+ 落ちる実証（--require-green の実赤アーム / 全 PASS 証拠の exit 0 アーム）
- typecheck・lint・dist:check・promote:self:check・coverage:ci・patch gate（push 前ローカル lcov）・complexity-gate
