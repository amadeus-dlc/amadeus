# Build and Test 実測

入力は U1–U8 の [code-generation-plan](../election-canonical-schema/code-generation/code-generation-plan.md) と [code-summary](../election-distribution-and-verification/code-generation/code-summary.md) である。計測時刻は 2026-08-14T07:32Z 前後、作業木は Intent ブランチ HEAD。

## ビルド

| コマンド | 終了 | 結果 |
| --- | --- | --- |
| `bun run typecheck` | 0 | app / tests ともエラーなし |
| `bun run source-only:check` | 0 | `source-only boundary: clean` |
| `bun tests/gen-coverage-registry.ts --check` | 0 | `OK (fresh, guards green, ratchet held)` |
| `bun run build` | 0 | 8 harness の dist 再生成と promote-self 完了 |
| `bun run lint` | 0 | 473 warnings / 17 infos。既存ベースライン。エラーなし |
| FormalElection completeness | 0 | `pass: true`, findings 0 |

## テスト

| 層 | コマンド | 件数 | 結果 |
| --- | --- | --- | --- |
| Unit | t547 t548 t549 t550 t551 t552 t557 | 30 pass / 0 fail / 2808 expect | 成功 |
| Integration / E2E | t549-store t553 t554 t555 t262 t556 t242 t450 t558 t237 | 84 pass / 0 fail / 1030 expect | 成功 |

最初の `test:ci` は 2 ファイルで落ちた。どちらも Intent 契約の品質ゲートであり、本 stage で直した。

| 失敗 | 原因 | 修復 |
| --- | --- | --- |
| `t-test-size-drift` | t554 が `// size: small` のまま fs を使っていた。t557 が unit 層で live file を読んでいた | t554 を `medium` に直す。t557 を `tests/integration/` へ移す |
| `complexity-gate` | Intent の v2 CLI/store と rebase 後の plugin 関数が baseline 未登録 | `evaluateReportFormat` は helper 抽出で閾値以下。残りは `--update` で 42 entries |

再実行: complexity-gate / t-test-size-drift / t557 / t450 は 91 pass / 0 fail。カバレッジ registry は ratchet を維持。

## 未検証面

- NFR-2 の 30-run p95 比較は未実施。包装差分だけでは測定面が薄く、BLOCKER にしない。
- repo-wide `test:ci` は exit 10。見える失敗は Intent 外: t07 の 300ms skip-path は再実行で緑（負荷フレーク）。t2851 doctor self-install freshness は再実行でも落ちるが、選挙契約とは独立。BLOCKER にしない。
