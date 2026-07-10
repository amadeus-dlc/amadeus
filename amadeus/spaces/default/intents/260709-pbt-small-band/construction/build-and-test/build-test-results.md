# Build & Test Results — pbt-small-band(実測)

実行: 2026-07-10、4/4 Bolt + #731 ガード修正マージ後の統合ツリー(record ブランチ、origin/main 4d6673d81 取込済み)

| 検証 | コマンド | exit | 結果 |
|---|---|---|---|
| 型検査 | bun run typecheck | 0 | PASS |
| リント | bun run lint | 0 | PASS |
| dist 同期 | bun run dist:check | 0 | PASS |
| self-install 同期 | bun run promote:self:check | 0 | PASS |
| **PBT 深掘り** | AMADEUS_PBT_DEEP=1 bun test(pbt 3ファイル) | 0 | 12 tests PASS(numRuns 50,000、3.40s)|
| フルスイート | bash tests/run-tests.sh --ci | 0 | **RESULT: PASS**(45 files / 298 tests / skip 3 = substrate ゲート正常、wall-clock drift 0)|

## Small band への寄与(実測)

size-annotated files: **28/339(intent 開始時)→ 35/346(完了時)** — 新規 Small テスト+7。Small≥90 は milestone(hard gate ではない、#697 明記)であり、本 intent は Phase B の第一歩として PBT 基盤+規約+5テストファイルを確立した。

## CI(GitHub Actions)実績

4 PR すべて全チェック green でマージ(#722 は setup-pack-contract の1回フレークを re-run で解消 — 変更起因でないことを再実行一致で確認)。#725 は codecov/patch が読み側シーム未カバーを正しく検出→ in-process シームテスト(t205)で解消。
