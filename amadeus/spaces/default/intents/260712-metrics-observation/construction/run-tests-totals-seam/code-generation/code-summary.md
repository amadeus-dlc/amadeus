# Code Summary — run-tests-totals-seam

## 変更ファイル

- `tests/run-tests.ts`: SUMMARY と同じ4カウンタを `coverage/tests-totals.json` に best-effort で出力する seam を追加した。
- `tests/lib/run-tests-totals.ts`: in-processで検証可能なpure mappingとwriterを分離した。
- `tests/unit/t220-run-tests-totals.test.ts`: 4キー、写像、coverage非依存、失敗隔離、SUMMARY不変を検証した。
- `tests/integration/t220-run-tests-totals.integration.test.ts`: 非coverage実行でJSONとSUMMARYが一致することを検証した。

## 判断

- 出力先は既存 `coverageRoot` を再利用し、ディレクトリ作成と書込失敗をwriter内に閉じ込めた。
- runnerの終了コード計算は変更していない。

## テスト結果

- unit: 7件 pass。
- integration: 1件 pass。
- typecheck: pass。

## 計画逸脱

- なし。
