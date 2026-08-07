# Build and Test Summary — 260807-failclosed-recovery-path

上流入力(consumes 全数): 各 unit の `code-generation-plan.md` と `code-summary.md`(3 unit: fix-2313-reconcile-freshness / fix-2330-advisory-store-recovery / fix-2358-unit-done-declaration)。詳細な実測値は `build-test-results.md` を正とする。

## ビルド状態と前提

- ビルド: success(`bun run build` / `bun run typecheck` / `bun run lint` すべて exit 0 — build-test-results.md 参照)。
- 前提: Bun ランタイムのみ。外部サービス不要。

## テスト種別インベントリ

| 種別 | 生成 | 根拠 |
|---|---|---|
| unit-test-instructions.md | ✅ | FR-1〜3 への trace 集合(10 ファイル) |
| integration-test-instructions.md | ✅ | 宣言機構 e2e・実 store 回復・着地面 |
| performance-test-instructions.md | ✅(適用外根拠を記載) | 性能 NFR 不在 — `cid:build-and-test:c4` |
| security-test-instructions.md | ✅(SAST/DAST 適用外、fail-closed 契約検証を記載) | セキュリティ専用 NFR 不在・患部は既存ガード整合面 |

## Unit ごとのカバレッジ期待

3 Bolt とも PR CI の Project/Patch Coverage Gate green で着地済み(#2387/#2389/#2392/#2393)。ローカル focused 再実行で機能面テスト全 green(117/118 — fail 1 は Issue #2403 のテスト間クロストーク、機能面の欠陥ではない)。

## 準備状況評価

- **build-ready**: ✅ / **test-ready**: ✅ / **deployment-ready**: N/A(本 repo はデプロイ基盤を持たず、リリースは release.yml の人間起動 — project.md Deployment)。

## 既知の制限・申し送り

1. **#2403**(bug/P2/S3): t480 integration のプロセスグローバル状態未復元による t458 の順序依存 fail(最小2ファイル決定的再現・CI 現行順序では latent)。
2. **#2397**(bug/P2/S3): PR #2393 coverage job の回転フレーク(3 run 連続・毎回別テスト)。
3. **#2401**(enhancement/P2): pr-convergence plugin がマージ済み PR の収束実績を機械記録できない(本 intent では人間裁定 override で回復済み)。

いずれも FR/NFR 受け入れ基準の外(実文照合済み)であり、verdict は無条件 READY とする(`cid:build-and-test:c2-unconditional-ready-boundary`)。
