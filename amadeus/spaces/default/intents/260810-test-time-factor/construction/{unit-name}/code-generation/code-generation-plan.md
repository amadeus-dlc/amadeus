# Code Generation Plan — TEST_TIME_FACTOR

`self-fix` / Minimal depth のため unit・story 成果物は存在しない。実装範囲は承認済みの `requirements.md` と Reverse Engineering CodeKB から直接導出する。Test Strategy は Comprehensive とし、性能閾値そのものは FR-7 により変更しない。

## 実装手順

- [x] **Step 1: 共通 helper の Red テスト** — `TEST_TIME_FACTOR` の未指定=`1`、`1`/`2`/`3`、不正値、切り上げ、overflow を unit test で先に固定する。`FR-1`, `FR-2`, `NFR-1`〜`NFR-4`。
- [x] **Step 2: 共通 helper の最小実装** — 環境変数の解決と基準ミリ秒の係数化を `tests/lib/` に集約し、個別テストによる再 parse を禁止する。`FR-1`, `FR-2`。
- [x] **Step 3: runner 契約の Red→Green** — 既定 `30_000ms` と `--test-timeout-ms` を基準値として係数化し、Bun child へ渡る値を runner/argv のテストで検証する。`FR-3`。
- [x] **Step 4: test timing sink の移行** — unit/integration/e2e/harness/lib の test timeout、process timeout、deadline と、それを構成・検証する sleep/poll/settle を helper 経由へ変更する。`AMADEUS_TEST_TIMEOUT` など最終 override、perf、slow/hang fixture、ISO 境界、本番 timeout は理由付き allowlist に残す。`FR-4`, `FR-5`, `FR-7`。
- [x] **Step 5: CI 配線と契約テスト** — 通常 CI、coverage head/base、PBT、release のテスト経路へ `TEST_TIME_FACTOR: "2"` を設定し、workflow 契約テストで漏れを検出する。`FR-6`。
- [x] **Step 6: 回帰防止ガードと文書** — 対象ディレクトリの固定 timing sink、存在しない/重複/理由なし allowlist を fail-closed に検査し、失敗 fixture を追加する。`docs/reference/09-testing.md` にローカル既定 `1`、CI `2`、低速環境 `3`、helper 利用規約を記載する。`FR-8`。
- [x] **Step 7: 検証** — 新規 unit/integration/workflow/guard テスト、関連 e2e/harness テスト、`bun run typecheck`、`bun run lint`、`bun run source-only:check`、`bun run test:ci` を実行する。Bun がテスト runner であり追加の test config は不要であることも確認する。

## 変更境界

- application code は workspace の既存ファイルを直接変更し、`dist/` や生成済み harness を手編集しない。
- timeout と無関係な待機、性能の wall-clock 閾値、本番 CLI の timeout 契約は変更しない。
- 各 Step は失敗テストを確認してから最小実装で Green に戻し、完了時にチェックを更新する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T17:00:33Z
- **Iteration:** 1
- **Scope decision:** approved — FR-8 — tests/lib/test-time-factor-guard.ts — reason: final override の taint 追跡と fail-closed な allowlist 検証を実装証拠として確認する — owner: amadeus/spaces/default/intents/260810-test-time-factor/inception/requirements-analysis/requirements.md#実装トレース: `FR-8` の機械検査は `tests/lib/test-time-factor-guard.ts` が所有する。

最終修正後の全CI相当Greenが未取得で、spot-checkによりfinal overrideと二重係数適用のfail-closed保証に3つの回避経路を確認した。

### Findings

- BLOCKER | 最終修正後に TEST_TIME_FACTOR=2 bun run test:ci を単一実行し、0 failure の証跡へ更新する必要がある。
- BLOCKER | final-timeout-rescale を allowlist へ追加すると evaluateTimingSinks が成功し、禁止sinkをallowlistで回避できる。
- BLOCKER | scaleTestTime(Number(process.env.AMADEUS_TEST_TIMEOUT)) の直接式はtaint追跡を回避できる。
- BLOCKER | scaleTestTime(scaleTestTime(30000)) の二重適用は固定値patternを回避できる。
- FOLLOW-UP | PR未作成の not-applicable-yet と converged false は妥当であり、PR作成後に三面収束を再評価する。
- NIT | timing guard の分類件数には再現コマンドを code-summary に併記する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T17:21:39Z
- **Iteration:** 2
- **Scope decision:** none

前回の4件のBLOCKERはすべて閉包され、TEST_TIME_FACTORの一回適用、final override非再scale、CI配線、fail-closed guard、全CI相当Greenの証跡が要件と整合している。

### Findings

- FOLLOW-UP | PR未作成のため not-applicable-yet / converged: false とする判断は妥当であり、PR作成時のみ三面を再観測する。
- NIT | pr-convergence-report.md の observed at を最終検証時刻へ更新する。
