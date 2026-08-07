# Performance Design — landed-report

上流入力(consumes 全数): `business-logic-model`(`construction/landed-report/functional-design/business-logic-model.md` — evaluate 改訂フロー・landed 経路・sensor 対応表を設計前提として消費)。nfr-requirements 系 5 consumes は scope self-feature の実行構成で nfr-requirements ステージが SKIP のため設計どおり不在(requirements.md の NFR-1〜4 が正本)。

## 性能特性

- 対象は単発 CLI(常駐サービスなし)— cache / horizontal scaling / circuit breaker は適用外(`cid:nfr-design:c1` — 決定的 file 境界と fail-closed 契約へ置換)。
- **主性能効果**: マージ済み PR の status/report は resolvePrLifecycle の単一 fetch で短絡し、既存の UNKNOWN リトライ(`MERGEABLE_UNKNOWN_RETRY_MAX = 5` / `MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS = 10_000` — predicate.ts:204-205 実測。最悪 5回×10s ≈ 50秒)を 0 にする(AC-2a: sleep seam 呼び出し 0 回で機械検証)。
- 未マージ PR: primed ラッパにより gh 呼び出し総数・タイミングは現行と byte 同一(business-logic-model Step 5 の conductor 実測)。

## 検証形

- 実時間測定はしない — sleep seam のカウント assert(決定的タイミングシーム)で構成要素を検証(`cid:build-and-test:wtfbt-c3` の型)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T11:28:36Z
- **Iteration:** 1
- **Scope decision:** none

CLI 系 NFR 設計則の意味論適合・FD/BR との部品名/型整合・NFR-1/3 整合・fs 規律・エラー経路全数を確認。FOLLOW-UP 2件(retry 定数と ADR-4 の出典確認)は設計骨格に影響せず READY。

### Findings

- FOLLOW-UP | performance-design の 5回×10s の出典 — conductor 裏取り: predicate.ts:204-205(MERGEABLE_UNKNOWN_RETRY_MAX=5 / INTERVAL_MS=10_000、RE scan 実測済み)を引用追記
- FOLLOW-UP | ADR-4 の実在 — conductor 確認: application-design/decisions.md に実在(スコープ外につきレビュー内検証不能だった)
- NIT | performance/scalability の gh 呼び出し主張の二重記述 — 将来ドリフトの芽(実害なし)
