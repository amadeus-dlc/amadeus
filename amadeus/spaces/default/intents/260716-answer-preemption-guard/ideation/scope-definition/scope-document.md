# Scope Document — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(問題定義・成功基準)、`../feasibility/feasibility-assessment.md`(技術前提の実測・(a)/(b) 見立て)、`../feasibility/constraint-register.md`(C1〜C8)。

## スコープ(amadeus — ユーザー裁定 2026-07-16 の scope 統一に準拠)

### IN

1. `checkQuestionsEvidence`(amadeus-lib.ts:1173、C1: 意味論不変)の **sensor 発火点追加** — `.claude/sensors/amadeus-<id>.md` manifest + `amadeus-sensor-<id>.ts` 実装 + stage frontmatter `sensors:` 宣言(対象ステージ集合は application-design で確定)
2. (b) lint 化の採否判断と、採用時のその実装(application-design で確定 — pre-approved 分岐)
3. enforcement cutoff の canonical 化検討(C2/R2 — 定数複製 drift の回避)
4. 落ちる実証(裁定参照なし記入 fixture で赤)+ corpus 全数 sweep(false-red 0)の両側実測(C6)
5. dist×5 / self-install×2 の再生成同期、runner-gen drift guard 確認(C4)

### OUT

- 述語の意味論変更(#1101 確定済み)/ gate-start 発火点の変更 / 質問ファイル様式の変更 / 旧様式 corpus の遡及是正

## 成功基準(intent-statement から継承、テスト可能)

1. fixture(裁定参照なし記入)で sensor FAILED が finding ファイル+監査行として観測される
2. 既存 corpus 全数 sweep で false-red 0
3. 全検証コマンド green(typecheck/lint/dist:check/promote:self:check/--ci)

## 前提・制約の要約

sensor = advisory 層、gate-start = fail-closed 層の二層責務(C3)。canonical 直実行禁止(C5)。語彙衝突トレース(C7)。実行時消費行への注入(C8)。
