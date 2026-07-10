# Performance Test Instructions — dynamic-test-size(#699)

> Minimal 戦略+NFR-4 は専用性能テストを要求しない(既測値の集約のみで新規計測プロセスなし)。専用の負荷試験は作成しない。

## 性能上の検証点(通常実行に内包)

- NFR-4: レポート生成の追加コストは全 tier 完了後の1回の集約+JSON 書き出しのみ。`bash tests/run-tests.sh --ci` の所要時間が従前と同等(±ノイズ)であることを実行ログで確認する。
- 収集は per-file の Map.set 1回(O(1))で、並列実行のスループットに影響しない。
