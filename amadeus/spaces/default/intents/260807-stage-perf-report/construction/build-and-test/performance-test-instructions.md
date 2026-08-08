# Performance Test Instructions — 260807-stage-perf-report

上流入力(consumes 全数): code-generation-plan(Step 12 の NFR-1 回帰上限 assert を検証設計として消費)、code-summary(実ワークスペース 1 回実行の実測秒数を基準線として消費)

## 対象 NFR

**NFR-1**: observed 全コーパスの走査+集計+出力を **60 秒以内**(実測ベースの回帰上限)。

## 試験の形

実時間の負荷試験ではなく、**実コーパスに対する 1 回実行の壁時計を回帰上限と突き合わせる** assert として `t487` に内包する(cid:build-and-test:wtfbt-c3 — 同じ制御経路を通る決定的な検証を実時間待機より優先)。

```bash
bun test tests/integration/t487-stage-stats.integration.test.ts --timeout=30000
# 該当: "scanning the real workspace stays well inside the sixty-second ceiling"
```

## 基準線(実測)

| 指標 | 実測値 | 上限 |
|------|--------|------|
| 実行時間(実ワークスペース) | **0.653 秒** | 60 秒 |
| 走査規模 | 225 シャード / 133,663 行 + record *.md | — |

上限に対して約 2 桁の余裕がある。上限超過は欠陥ではなく回帰シグナルとして扱い、走査の多重化(同一シャード再読)の混入を第一容疑とする(performance-design)。

## 負荷試験を作らない理由

対象は単発実行・ローカル完結・read-only の CLI であり、同時実行・多ユーザー・水平分散のスケール軸が存在しない(nfr-design:c1 に従い常駐サービス向けセレモニーを持ち込まない)。スケール軸はコーパスの単調増加のみで、計算量は行数に対して線形。
