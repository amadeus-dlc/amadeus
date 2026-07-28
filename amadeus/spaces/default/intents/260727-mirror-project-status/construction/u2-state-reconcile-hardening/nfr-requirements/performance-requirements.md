# Performance Requirements — u2-state-reconcile-hardening

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

U2 は失敗・再試行セマンティクスの完全化であり、性能面の中心は **reconcile が呼び出し回数予算を破らないこと**(requirements NFR-3 の assert 実装は本ユニット責務 — business-rules BR-U2-7)。常駐サービスを持たない CLI(technology-stack: Bun/TypeScript ESM)のため、レイテンシ SLO は置かない(u1 と同根 — requirements FR-1b の N/A 規律)。

## 呼び出し回数予算(requirements NFR-3 — U2 が assert を所有)

- Project あたり上限: 照会 **1回**+mutation **≤2回**(business-logic-model 検証面の設計値「照会1+mutation≤2」の verbatim 採用)。所属照会 `listProjectItems` は boundary あたり **1回**(business-logic-model 手順1)。
- **reconcile の追加コストゼロ**: 台帳が synced の Project は再実行で mutation を発行しない(business-rules BR-U2-4 の冪等 — 二重実行テストで mutation 総数不変を assert)。pending / safety-blocked の再評価も同一予算内(business-logic-model の一律再分類 — 状態別の追加照会を作らない)。
- 検証: FakeGateway の history 検査で per-Project 呼び出し回数上限を assert(NFR-3 受入基準 — BR-U2-7)。実時間の負荷試験は行わない(counter assertion で構成 — cid:build-and-test:bt-timeout-verification-shape)。

## 実行時間の境界

- gh サブプロセスの deadline/stdout cap は u1 と同一の既存 profile(実装直読: amadeus-mirror-runner.ts:29 `single: { deadlineMs: 30_000, stdoutLimitBytes: 1 * MiB }`)。U2 で新しいタイムアウト・throttle を導入しない(requirements NFR-3 後段 — rate-limit は 429 → retryable 分類で吸収)。

## 非目標

- レスポンスタイム SLO・スループット目標: N/A(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。cid:observability-setup:c3 の N/A 規律)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:53:22Z
- **Iteration:** 1
- **Scope decision:** none

BR/FR 引用と許可 file:line 3件は全一致だが、宣言 consumes に実在しない実装シンボル名(resolveProjectStatusField / PROJECT_SYNC_KEYS 等 / ReducerResult)の無引用断定 Major 3件+帰属不正確・FR-7d 未カバーの Minor 2件。

### Findings

- [Major] performance-requirements.md:9 resolveProjectStatusField の無引用断定(consumes 4件に不在)
- [Major] security-requirements.md:17 PROJECT_SYNC_KEYS/PROJECT_ENTRY_KEYS/projectSync の無引用断定(consumes に不在)
- [Major] tech-stack-decisions.md:9 ReducerResult: changed/unchanged/invalid の無引用断定(consumes に不在、transition 3種の実名は business-logic-model :13)
- [Minor] scalability-requirements.md:8 台帳保持方針の business-logic-model への帰属が不正確(該当記述なし)
- [Minor] reliability-requirements.md:5 FR-7 全補宣言に対し FR-7d(body 層失敗検出)が全5ファイル未カバー

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:56:58Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の5件是正すべてが consumes の実在記述へ verbatim 接地し、許可実装引用3件も再実測一致。新規矛盾なし。

### Findings

- None
