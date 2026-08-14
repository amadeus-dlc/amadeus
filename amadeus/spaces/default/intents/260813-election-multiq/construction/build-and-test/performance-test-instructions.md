# 性能テスト手順

NFR-2 は [U8 code-generation-plan](../election-distribution-and-verification/code-generation/code-generation-plan.md) と [code-summary](../election-distribution-and-verification/code-generation/code-summary.md) が、1 question・3 choices・3 voters の p95 比較を要求する。

## 測定面

baseline は Intent 開始点 `c0f9edf27828def6fa3dbbbc4101d753b398e025`。treatment は現 HEAD。同一 Bun / OS / CPU で definition parse → ballot validation → tally → record render を warm-up 5 回のあと各 30 回交互計測する。

## 判定

nearest-rank p95 の増分は `max(baseline p95 × 20%, 5 ms)` 以下。意味互換は性能とは別に canonical result で見る。

## 本 stage の扱い

包装差分（skill / peek / norm）だけでは測定面が薄い。未実施なら [build-test-results](./build-test-results.md) に未検証面として残し、BLOCKER にしない。
