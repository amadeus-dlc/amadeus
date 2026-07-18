上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun・`bun:test`・既存 tier ランナーを前提とし、新規の実行基盤や依存を追加しない。

# 性能要件 — U2 層責務仕様と tier-aware ドリフト判定

本書は、`business-logic-model.md` の tier×measured 判定、`business-rules.md` の比率目標と実行時間予算方針、`requirements.md` の FR-2/FR-3/FR-5 を性能面から具体化する。現行テスト母集団の measurement ref は `3917a283a953165866170d235d3dc25ad2fd3643`、検証 HEAD は `7ce376ed008fc77a7df25429fb311b45bd69537b` であり、両 ref 間の `tests/`・`tests/run-tests.ts`・`tests/lib/test-size.ts`・`scripts/metrics-snapshot.ts` 差分は 0 件である。

## PERF-1: tier-aware 判定の計算量と資源制約

tier-aware 判定は U1 の `SizeLedger` 各行に対し、次の処理を各1回だけ行う。

1. 4 named tier だけを規約対象として識別する。
2. `allowedMaxSize(tier)` を1回引く。
3. 既存 `SIZE_ORDER` で `measured` と上限を1回比較する。
4. `over-limit` だけを `TierDriftReport` に集計する。

したがって時間計算量は台帳行数 N に対して O(N)、追加メモリは violation 件数 V に対して O(V) とする。現行 442 行では `unit` の medium 162件 + large 1件だけが上限超過となり、violation は 163件である。判定中にファイル再読込、ネットワーク、DB、子プロセス、キャッシュ、並列ワーカを追加しない。size 分類自体は `classifyTestSize` の出力を再利用し、独自分類を二重化しない。

この判定 IF の実装・CI 配線・exit code・落ちる実証は別 intent であり、本 intent は設計までとする。未実装の処理へ秒数 SLO を置く強制メカニズムは存在しないため、判定単体の応答時間・スループット閾値は N/A とする。

## PERF-2: 比率ガイドラインの定量目標

FR-2 の中長期ガイドラインを次の named 目標として扱う。これは強制ゲートではなく、移設後の分布を評価する指針である。

| 目標定数 | 目標 | 現行実測(442件) |
| --- | --- | --- |
| `RATIO_TARGET_SMALL_MIN` | small ≥ 50% | 60/442 = 13.6% |
| `RATIO_TARGET_MEDIUM_MAX` | medium ≤ 45% | 379/442 = 85.7% |
| `RATIO_TARGET_LARGE_MAX` | large ≤ 5% | 3/442 = 0.68% |

比率の分母は `tests/` 全域再帰の全行とし、harness/lib 等の補助 tier も台帳・分母には残す。一方、tier 上限規約は 4 named tier にだけ適用する。この二つを混同しない。

## PERF-3: tier 別実行時間予算の確定条件

FR-5 の実行時間予算は設計対象だが、現 record には tier 別 wall-clock の実測値がなく、現時点の具体値は **PENDING** とする。N/A や達成済み PASS には置き換えない。

閉包条件は、同一 HEAD・同一ホストで CI と同じ既定の直列条件を使い、`bash tests/run-tests.sh --smoke`、`--unit`、`--integration`、`--e2e` を個別実行して各コマンドの wall-clock・テスト件数・成否を保存すること。その実測値から tier ごとの named 目標定数 `TIME_BUDGET_{TIER}_SECONDS` の候補を作る。ソロモードでは選挙を使わず、測定結果と推奨値を人間へ直接提示し、承認後にだけ確定値を書く。

強制ゲート化、`tests/run-tests.sh` の変更、比率・時間値のコードへのハードコードは本 intent Out である。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-17T16:18:50Z
**Iteration:** 1

### Findings

blocking finding はない。5成果物は、上流の U2 functional-design、`requirements.md`、codekb `technology-stack.md`、適用ノルムと整合している。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| audit shard の今回の手動 sensor fire（`required-sections`） | PASS 5/5（fire id: `1de9cf99`, `22c398ac`, `27f57147`, `98bbd592`, `6a46441e`） | audit の `SENSOR_PASSED` 行で U2 NFR 5成果物の必須節を確認。fire の exit code は verdict 根拠にしていない。 |
| audit shard の今回の手動 sensor fire（`upstream-coverage`） | PASS 5/5（fire id: `91156965`, `947e85c1`, `6e2da326`, `67f1e480`, `d3d75100`） | audit の `SENSOR_PASSED` 行で 5成果物すべての必須上流参照を確認。今回の U2 範囲で `SENSOR_FAILED` は 0 件。 |
| 現行 `classifyTestSize` の `tests/` 全域再帰スイープ | PASS: 442件、unit 48/162/1、integration 9/138/0、e2e 3/63/2、smoke 0/14/0、harness 0/1/0、lib 0/1/0、size 合計 60/379/3 | U2 文書の母集団・比率（13.6% / 85.7% / 0.68%）と完全一致。unit 非 small 163件、signal FS 153 / spawn 99 / network 1 / timer 1（重複あり）も独立再現した。 |
| `git diff --name-only 3917a283a953165866170d235d3dc25ad2fd3643 HEAD -- tests tests/run-tests.ts scripts/metrics-snapshot.ts` | PASS: 差分 0件、HEAD `7ce376ed008fc77a7df25429fb311b45bd69537b` | performance-requirements.md の measurement ref 鮮度主張を確認。 |
| NamedTier / 補助 tier 契約の照合 | PASS | 4 named tier だけに上限規約を課し、harness/lib 等は台帳・比率分母に残しつつ violation 母集団から除外している。開いた `Tier` と閉じた `NamedTier` を混同していない。 |
| 実行時間予算と fail-closed / 既存 gate 契約の照合 | PASS | 予算値は `PENDING`、既存 runner による閉包条件、ソロモードでの人間直接確認が明記されている。判定不能を zero-violation へ縮退させず、既存 declared-vs-measured gate を変更・迂回しない。failure 型・CI 赤化・exit code・落ちる実証は別 intent とする境界も一貫している。 |
| スコープ境界の照合 | PASS | 本 intent を設計・計画に限定し、実装、CI 配線、runner 変更、強制ゲート化、#1157 着手を含めていない。 |

### Summary

数値は現行決定的関数の全数適用で再現でき、規約対象4 tier と補助 tier の分離も一貫している。未実測の実行時間予算は PENDING のまま閉包条件と人間確認へ接続され、fail-closed と既存ゲート非破壊も両立しているため READY と判定する。
