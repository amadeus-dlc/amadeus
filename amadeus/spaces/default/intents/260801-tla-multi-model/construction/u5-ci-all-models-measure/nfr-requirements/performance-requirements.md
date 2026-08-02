# Performance Requirements — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): business-logic-model(u5 functional-design §2.2 / §3.4 / §7 / §8 — 実行マトリクス・run 予算・計測計画・エスカレーション), business-rules(BR-E1〜E4 / BR-T1〜T2), requirements(FR-5, NFR-1〜4, Assumptions D3, Constraints)

本 Unit は内部 CLI/CI 検証ツールの変更であり、ユーザー向けレイテンシ・スループットの対象を持たない。性能 NFR は **CI ジョブの時間予算への適合**として定量化する。

## PR-1: CI ジョブ時間予算(30 分 timeout 内)

- 要件: formal-model-check ジョブが全登録モデル(FormalElection + MirrorLifecycle)を逐次実行し、ci.yml の `timeout-minutes: 30` 内で完了すること。
- 測定可能な分解(business-logic-model §7.1):
  - bootstrap(docker image pull + tla2tools jar download): 最大 300 秒の既存見積り。
  - per-run 予算: port の run 予算 **190 秒据え置き**(BR-T1 で本 Unit での緩和禁止)。
  - マトリクス: モデル数 × 6 run(warm-up 0 + measured 1-5)。2 モデルなら 12 run。
- 判定: ADR-8 measure-first。diagnostic 事前計測 → per-run 予算との整合確認 → CI 実測の順で検証し、実測値を record の code-generation 証跡へ固定する(BR-E1)。
- 超過時: 要件側の time-box 後続裁定へエスカレーション(BR-T1/T2、BLM §8)。本 Unit で timeout・予算・マトリクスを緩めて閉じない。

## PR-2: MirrorLifecycle 完全探索の基準値(Assumptions D3)

- 要件: MirrorLifecycle AsIntended の完全探索が基準値と一致して完了すること — generatedStates = 208,628、distinctStates = 89,099、searchDepth = 18、statesLeftOnQueue = 0、completion marker 存在(BR-E2 の完全一致 pin)。
- 位置づけ: これは性能目標というより**決定性の検証基準**(TLC 固定 jar・workers 1・同一 cfg で決定的)。所要時間は計測して記録するが、閾値は設けない(実測待ちのため数値目標を捏造しない — BR-E2 の「下限/範囲緩和禁止」と対)。

## PR-3: リソース利用

- 要件: モデル反復は**逐次**(並列化禁止 — ADR-4 却下案 (b)、reservation 機構非侵襲)。docker isolation 引数検査(validateDockerReceipt)は不変(BR-F2)。新規の常駐プロセス・メモリ要件の追加なし。

## N/A 判定(該当しない性能カテゴリ)

- レスポンスタイム / スループット / UI レイテンシ: **N/A** — CLI/CI バッチツールであり、同期応答する API や UI を持たない(business-logic-model §0: 変更対象は CI 実行系の4ツール + ci.yml + doc のみ)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:52:59Z
- **Iteration:** 1
- **Scope decision:** none

All 5 produces exist; CI time budget/statistics pin/fail-closed/permissions-minimal quantified; 1 advisory minor (worst-case arithmetic note for PR-1). READY.

### Findings

- None
