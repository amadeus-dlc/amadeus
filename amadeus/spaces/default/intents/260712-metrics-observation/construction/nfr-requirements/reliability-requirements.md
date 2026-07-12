# Reliability Requirements — metrics-observation

- **R-1: アトミック性** — temp→rename(同一ファイルシステム内)。部分 snapshot の観測可能性ゼロ(FR-4)。
- **R-2: loud fail** — collector 失敗・書き込み失敗・git 失敗のすべてで exit 1+失敗点明示。リトライは機構内に持たない(workflow の手動 re-run が回復経路 — 冪等性により安全)。
- **R-3: 冪等性** — 同一コミットへの複数実行は独立ファイルを生成し互いを破壊しない(captured_at 由来のファイル名)。
- **R-4: 回復可能性の分類**(error-classification)— collector 失敗 = fault(環境)→ fail-fast。スキーマ組み立て失敗 = defect(バグ)→ fail-fast+要修正。いずれも回復可能扱いのリトライはしない(観測データは次のマージで自然に再取得される — 欠測は許容、誤データは不許容)。
