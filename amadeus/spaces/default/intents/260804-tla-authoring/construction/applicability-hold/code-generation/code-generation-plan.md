# Code Generation Plan — U2 applicability-hold(Bolt 2、バッチ 2)

上流入力(consumes 全数): U2 の functional-design(business-logic-model.md / business-rules.md / domain-entities.md)と nfr-design(security-design.md / logical-components.md)、`bolt-plan.md` Bolt 2 節(2026-08-04T18:29:01Z 改訂追記込み)、`requirements.md` FR-001 / FR-005。

## 実装ステップ(TDD vertical slice — 受け入れ基準の述語を逐語で写す)

1. C1 判定表: `ApplicabilityJudge.judge` — 閉じた判定表 J1..J6(J2 矛盾4形 J2a-d は lookup、整合4経路は CONSISTENT_ROUTES)、`subjectSeriesKey`(subject ID 集合のみの sha256、content-free = AC-006)、`intersectsRegisteredModel` は集合積のみ(BR-U2-02)— 失敗テスト先行(t444-judge)
2. C1 receipt: `buildReceipt` — TERMINAL_ROUTES(impl-only / non-target)は非 null 承認 + 注入 `verifyApproval` 通過を要求、欠落は `{kind:"approval-missing"}`(BR-U2-24 偽装否定込み)— t444
3. C9 hold 評価表: `AuthoringHoldEvaluator.evaluate` — 5行判定表 + HoldFailure 3種(evidence-unreadable / model-map-unreadable / corrupted-evidence)を fail-closed 分離、predecessor 連鎖の chain-tip 解決 + tipReason 判定 — t444-hold
4. CLI verbs: `applicability judge|receipt|series` / `hold` / `advisory hold`(specs/tla/authoring-subjects.json 読取、不在は真の no-hold)— t445(in-process seam 駆動、Bolt 2 期待デモ2例 = receipt 不在→hold / current terminal receipt→no-hold を固定)
5. engine 宣言駆動供給(ADR-6 改訂裁定の2一般化点): `amadeus-advisory-declaration.ts` 新設(宣言 parse / argv token 解決 / stdout typed verdict 権威 = BR-U2-20 / argv-only spawn = BR-U2-19)+ `advisoriesForHost` 合流。既存 spec-hash 経路は無改変(BR-U2-21)— t444-declaration / t445-supply
6. 検証: typecheck / lint / 対象テスト / pin 回帰(t320・t-advisory-human-choice-boundaries)/ full CI を worktree solo で完走

## 品質規約

functional domain modeling(判定表 lookup + Result、throw を制御フローに使わない)。checkpoint 機構(発火点・解除規則)は無変更(BR-U2-08)。hold 解除の唯一の経路は C9 の no-hold verdict(BR-U2-05)、人間の defer-with-risk は既存 checkpoint 責務(BR-U2-06)。
