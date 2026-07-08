# Performance Test Instructions — installer-distribution

> ステージ: build-and-test (3.6) / 戦略: Standard のため専用パフォーマンステスト層は生成しない(根拠付き宣言)

## 適用範囲の宣言

性能 NFR は2点のみで、いずれも既存テスト層に計測が組み込み済み — 専用の負荷試験・ベンチマーク層は不要:

- **NFR-001(install ≤1分・正常経路)**: `tests/e2e/setup-install.test.ts` が子プロセス起動〜終了を計測(CLI 本体に計測コードなし — U2 nfr-design/performance-design.md の実装位置決定どおり)
- **pack 検証 ≤28秒(U4 バジェット)**: `setup-pack-contract.test.ts` は実測 ~650ms(3回の npm pack 込み)

## 実行方法

上記は unit/integration/e2e の通常実行に包含される(独立コマンド不要)
