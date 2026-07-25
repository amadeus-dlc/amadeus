# Performance Test Instructions — 260725-solo-standing-grants

上流入力（consumes 全数）: `construction/grant-authorization-domain/code-generation/code-generation-plan.md`、`construction/grant-authorization-domain/code-generation/code-summary.md`、`construction/solo-gate-transaction/code-generation/code-generation-plan.md`、`construction/solo-gate-transaction/code-generation/code-summary.md`、`construction/harness-contract-and-regression/code-generation/code-generation-plan.md`、`construction/harness-contract-and-regression/code-generation/code-summary.md`

- U1 の `code-summary.md` — audit shard を row ごとに1回ずつ走査する列挙契約を引き、計測対象を「event 訪問回数」と確定した。
- U1 の `code-generation-plan.md` — 走査経路の所有 file を引き、counter を仕込む seam を確定した。
- U2 の `code-summary.md` / `code-generation-plan.md` — route/commit が lock 内で receipt を1回だけ解決する構造を引き、実時間待機を伴う負荷試験ではなくラウンド数・訪問回数の決定的検証を選ぶ根拠とした。
- U3 の `code-summary.md` / `code-generation-plan.md` — harness 投影が純粋な生成物同期であり実行時性能を持たないことを引き、U3 を性能検査の対象外とした。

## 選定根拠（比例選定）

`project.md` の `cid:build-and-test:c1` / `c3` に従い、戦略名（Comprehensive）だけを理由に検査を機械追加しない。本ファイルを生成するのは、承認済み NFR に実在の性能目標があるためである。

- **U1-PERF-02**（`grant-authorization-domain/nfr-requirements/performance-requirements.md`）: space 内 100 intent・計 100,000 audit events から Route Id exact lookup を行い、**event 訪問回数 `= E`**（線形一回走査）かつ **CI で 5 秒以内**。判定の主軸は wall clock 比ではなく operation counter で、5 秒は 100,000 event fixture の退行上限として併用する。

負荷生成基盤・ベンチマークハーネス・スケーリング検証は本 intent の対象外（CLI／library であり常駐 service を持たない。`cid:nfr-design:c1`）。

## 対象と実行方法

```
bun test tests/integration/t-solo-standing-grant-domain.test.ts -t "looks up one receipt"
```

対象テスト: `tests/integration/t-solo-standing-grant-domain.test.ts` の
`looks up one receipt across 100 intents and 100,000 events within 5 seconds`。

## 合否判定

| 判定軸 | 基準 | 種別 |
|---|---|---|
| 訪問回数 | counter assertion が線形一回走査（`= E`）であること | blocking |
| wall clock | 100,000 event fixture で 5 秒以内 | 退行上限（併用） |

fixture は固定 synthetic data と固定 Route Id を使い、warm-up 後の最大値で判定する。相関のない wall clock 比率を単独の合否根拠にしない。

## 実測結果

| 実行 | 結果 |
|---|---|
| 単体実行（`-t "looks up one receipt"`） | 1 pass / 0 fail、`Ran 1 test across 1 file. [159.00ms]` |
| ファイル全体 | 18 pass / 0 fail、52 expect()、168ms |

wall clock は退行上限 5 秒に対して十分な余裕があり、blocking 判定である counter assertion も pass している。

## 対象外として明示する事項

- 常駐 service の SLO、可用性ウィンドウ、スループット目標は本プロジェクトに実在しない（`cid:observability-setup:c3` に従い、単発 run 成功を service SLO 達成へ昇格させない）。
- auto-scaling 検証は適用対象なし（N/A — デプロイ基盤を持たない、`project.md` § Deployment）。
