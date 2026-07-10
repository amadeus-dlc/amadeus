# Integration Test Instructions — integrity-batch

- 実行: `bash tests/run-tests.sh --integration`
- #705 により `tests/integration/sdk-drive.calibration.test.ts` がランナー管理下に編入済み。AWS 資格情報が無い環境では `SKIP (Claude substrate unavailable)` が正常挙動(他の live SDK テストと同一の substrate ゲート)
- 実行確認: `bash tests/run-tests.sh --integration --filter 'sdk-drive\.calibration'` で START/SKIP/DONE が出ること
