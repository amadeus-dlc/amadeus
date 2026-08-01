# Requirements Analysis 質問記録 — 260801-cg-plan-guard

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md

- Q1 の A/B 二択は `code-structure.md` 現在節の患部(parseUnitsBlock)と #1893 クロスレビュー2名の実測(様式仕様の非曖昧性・逸脱1件のみ・malformed の3層 loud)から構成した。
- Q2 の射程精密化は `architecture.md` / `code-quality-assessment.md` 現在節の無音 degrade 3経路の記述を、レビュー実測(recoverBoltDag の throw 導入済み)で更新して構成した。
- 諮問順は `business-overview.md` / `intent-statement.md` の delivery boundary(B1 = 判定基盤が先行)に従い、判定入力(#1893/要件3)の確定を最優先とした。

E-OC1 判定: 両問とも仕様裁定(ソロモードではユーザー専権)のため選挙なし・ユーザー直接裁定。記入は裁定受領後。
ユーザー承認: 2026-08-01T08:55:00Z

## Q1: #1893 の修正方向

クロスレビュー両名の実測収斂(様式仕様は起草時から `- name:` 規定で曖昧さなし・逸脱は当該 record 1件のみ・malformed は現 HEAD で3層 loud)を提示し、(A) parser 受理拡張 / (B) record 是正 を諮問。

[Answer] B: record 是正を採用。260712 record の3構造(- id: / edges: 節 / 行末コメント)+H2 floor を仕様形へ是正し、parser は寛容化しない(機械可読ミラー契約の維持 — 両レビュアー支持)。ユーザー承認: 2026-08-01T08:55:00Z

## Q2: #1892 要件3の射程精密化+autonomy 未設定期の扱い

レビュー実測(malformed は recoverBoltDag 経由で既に orchestrator throw = fail-closed 済み。真の無音面は (a) ファイル absent と (c) compile 欠落の下流区別不能)を提示し、射程更新と autonomy null の扱いを諮問。

[Answer] (a)(c) を fail-closed 化の対象とし、malformed は既 fail-closed として対象外。autonomy 未設定×並行幅宣言はラダープロンプトへ redirect する3部メッセージで発動(無音 false を残さない)。ユーザー承認: 2026-08-01T08:55:00Z

## Q2r: 要件3の再裁定(前提訂正、§12a iteration 1 の Major を受けて)

§12a reviewer が Q2 の前提「malformed は既 fail-closed」が半分のみ真と実測(recoverBoltDag throw は orchestrator 経路限定 — `amadeus-orchestrate.ts:1490-1491`。compile 経路は `computeBoltDag` の stderr を hook `amadeus-runtime-compile.ts:205-217` が exit 0 時に読まず、完全無音)。裁定 B により将来の様式ミスがこの経路を通るため、正前提で再諮問。

[Answer] absent+malformed を対象とする。FR-3(a) を「computeBoltDag 源泉での absent または malformed」へ拡張(`:789` の if(boltDag) は欠落理由非依存で修正は自然に一般化)。recoverBoltDag の既存 throw は無改変維持。ユーザー承認: 2026-08-01T09:20:00Z
