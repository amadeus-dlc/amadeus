# Metrics PR 競合の差分再スキャン

## スキャン識別

- Date: `2026-07-30`
- Intent: `260730-metrics-pr-conflicts`
- Repo: `amadeus`
- Scope: `amadeus-bugfix`、Minimal、Brownfield
- Base commit: `ca8ff0af40d6250edffe42246d3f5538819c22af`
- Observed commit: `22ee27dbef9027203658a6cd98bf97501c4b222c`
- Base ancestry: ancestor、距離 **13**
- Focus: metrics snapshot PR が共有 `metrics/index.html` と retention 削除集合を同じ変更集合へ含めることで競合・滞留する問題、および同一 SHA 再実行の非冪等性

本記録は当該 intent 固有の差分 base point である。共有 `reverse-engineering-timestamp.md` は repo の最新鮮度ポインタであり、本 intent の次回 base は本ファイルの observed commit から解決する。

## 差分証拠

### Workflow と GitHub 状態

- `.github/workflows/ci.yml:475-488` は `metrics-snapshot-main` の固定 concurrency を設定する。
- `:522-546` は snapshot 生成、retention 適用、dashboard 生成、`git add -A metrics/` を同一 commit / PR へ束ねる。
- `:552` の branch は SHA 先頭12桁と `GITHUB_RUN_ATTEMPT` を使い、`:554-558` で PR を作る。
- `:559` は `gh pr merge --auto` を登録するだけで、merge-status wait なしに `:564` でジョブが終わる。したがって job serialization は merge 完了まで届かない。
- [PR #1727](https://github.com/amadeus-dlc/amadeus/pull/1727)、[PR #1728](https://github.com/amadeus-dlc/amadeus/pull/1728)、[PR #1729](https://github.com/amadeus-dlc/amadeus/pull/1729) は約 20〜26 秒間隔で作成され、共有 index の更新で `CONFLICTING` / `DIRTY` となった。#1729 は OPEN のまま、remote `metrics/snapshot-*` branch は 11 本残存していた。
- `push.paths-ignore: metrics/**` は metrics-only merge の再帰起動を防ぐため維持が必要である。

### データ ownership と将来リスク

- `metrics/*.json` は観測時 **162 件**、`METRICS_RETENTION_KEEP_LAST` は **360**。現時点の直接競合 root は `metrics/index.html` である。
- 上限到達後は、複数 snapshot PR が同じ base から同じ旧 JSON を削除し、retention deletion set も共有競合 root になる。
- `metrics-snapshot.ts` のファイル名は `captured_at + commit 先頭12桁`、workflow branch は SHA 先頭12桁 + run attempt であり、同一完全 SHA の再実行を重複として検出しない。
- Snapshot Writer、Timeseries Reader、Retention Pruner、Visualizer の個別処理は再利用可能だが、同一 Publisher が固有 JSON と共有 projection / deletion を所有する結合が誤りである。

### テスト証拠

対象テストは t221 / t222 / t231 / t298。conductor 実行の
`bun test tests/unit/t222-ci-snapshot-wiring.test.ts tests/integration/t222-ci-snapshot-branch.integration.test.ts`
は **21 pass / 0 fail** だった。これは fixed concurrency、attempt branch、auto-merge、snapshot PR 内 prune を現在の正解として固定していることの証拠であり、実障害の反証ではない。

不足する契約テストは、delayed merge / `CONFLICTING`、同一 SHA の landed / OPEN PR 検出、Snapshot PR の JSON-only change-set、Maintenance の単一 ownership と非並行 generation、auto-merge 登録後の状態 reconciliation である。t221 は同じ commit から時刻違いの 2 JSON を許すため、完全 SHA 冪等性へ改訂が必要である。

### 取得済み trunk との差

現 HEAD は取得済み `origin/main` に対して local-only 2 / remote-only 29 で分岐している。metrics 実装 4 script は差分 0 で、`.github/workflows/ci.yml` の差は本 focus と無関係な step display name だけだった。この情報は fetch-only の参考比較であり、`origin/main` を本スキャンの observed commit として扱わない。

## アーキテクチャ統合

### Per-commit Snapshot Publisher

- 完全 SHA ごとに不変 JSON をちょうど 1 件所有する。
- `metrics/index.html` と retention 削除を変更してはならず、PR change-set は JSON 1 件追加だけにする。
- 作成前に landed snapshot と同じ SHA の OPEN PR を照会し、存在時は no-op にする。
- auto-merge 登録と merge 完了を区別し、最終状態を照合または異常表示する。

### Single Maintenance Publisher

- `metrics/index.html` と retention 削除の唯一の書き手になる。snapshot は生成しない。
- 最新 `main` に landed した JSON 集合だけを入力とし、保持集合と index を再計算する。
- 1 本の安定 branch / PR を upsert し、複数要求を coalesce する。同時 generation を禁止する。
- auto-merge 登録後の merge 結果を照合し、`OPEN` / `CONFLICTING` 等の未収束状態を隠さない。

この境界は、元の「per-commit JSON は構造的に非競合」という要件を回復しつつ、後発の可視化要件を単一 maintenance ownership の下で維持する。fixed job concurrency を merge serialization の代替として扱わない。

## センサー適用性と代替検証

RE ステージは `required-sections` / `upstream-coverage` / `answer-evidence` を宣言するが、共有 codekb 出力パスは既存 sensor filter に構造的に適合しない。このため sensor 成功として記録せず、初回実装 commit `9144c3f61` の current-layer manifest から再生成した次の12ファイルを代替検証対象とする。

```text
amadeus/spaces/default/codekb/amadeus/re-scans/260730-metrics-pr-conflicts.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/amadeus-state.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/audit/j5ik2o-mac-studio-lan-0ac18f6e5802.jsonl
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/construction/code-generation/memory.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/construction/metrics-publication-convergence/code-generation/code-generation-plan.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/construction/metrics-publication-convergence/code-generation/code-summary.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/inception/requirements-analysis/memory.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/inception/requirements-analysis/requirements-analysis-questions.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/inception/requirements-analysis/requirements.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/inception/reverse-engineering/learnings-selections.json
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/inception/reverse-engineering/memory.md
amadeus/spaces/default/intents/260730-metrics-pr-conflicts/verification/phase-check-inception.md
```

- Markdown 10ファイルはすべて H2 見出しが2個以上。
- 正準 conflict marker の行が0件。
- JSON 1ファイルと JSONL 1ファイルは全レコードを `jq` で構文確認。
- 上記12ファイル限定の `git diff --check` が成功。

## Delivery boundary

本 re-scan 固有の CodeKB 成果物は本記録1件であり、同じ current layer には後続ステージが生成した intent state / audit / memory / requirements / code-generation 記録11件が含まれる。`architecture.md` を含む共有 CodeKB 本文は参照入力であり、この manifest では更新していない。修正実装では Snapshot Publisher と Maintenance Publisher の ownership、完全 SHA 冪等性、PR 状態 reconciliation をこの境界から逸脱させない。

## 次工程への引き渡し

Requirements Analysis では、完全 SHA の既存判定順序、stable maintenance branch / PR の upsert 規約、merge 状態の待機時間と失敗表示、coalescing trigger、JSON-only change-set の機械検査を受入条件へ落とす。Code Generation では t221 / t222 を先に失敗させ、t231 / t298 の既存 pure contract を維持したまま workflow ownership を分離する。
