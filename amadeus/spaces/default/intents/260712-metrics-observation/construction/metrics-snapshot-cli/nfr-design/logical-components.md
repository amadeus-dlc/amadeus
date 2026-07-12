# Logical Components — metrics-observation(nfr-design 視点)

| 論理コンポーネント | NFR 担保 | 保証機構(層別) |
|---|---|---|
| CLI verbs 層(C1) | P-3 / R-2 | 統合テスト timeout / 注入テスト |
| collector 層(C2) | S-3 / SC-3 | numeric-parse 検証 / 配列駆動+スキーマテスト |
| writer 層(C3) | R-1 / R-3 / SC-1 | temp→rename / 衝突エラー / 16KB assert |
| run-tests seam(C4) | (機能要件のみ — NFR は best-effort try/catch) | printSizeMatrix 様式 |
| CI job 層(C5) | P-1 / P-2 / S-1 / S-2 / S-4 | timeout-minutes / t222 文字列アサート / 実 run 確認 |
