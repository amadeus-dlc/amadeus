# Code Summary — metrics-snapshot-cli

## 変更ファイル

- `scripts/metrics-snapshot.ts`: CLI、依存注入seam、6 collector、fail-fast組立、16KB検査、atomic writerを追加した。
- `tests/unit/t221-metrics-snapshot-{core,cli,collectors}.test.ts`: core、CLI引数、collector契約を検証した。
- `tests/integration/t221-metrics-snapshot.integration.test.ts`: temp→rename、衝突非上書きを検証した。

## 判断

- coverage collectorは既存成果物の実契約 `hits` / `lines` を読み、percentを導出する。
- collectorは配列駆動とし、最初の失敗をcollector名付きで返す。
- ファイル名はUTC時刻とcommit短縮値から生成し、既存ファイルを上書きしない。

## テスト結果

- unit: 26件 pass。
- integration: 5件 pass。
- typecheck: pass。

## 計画逸脱

- なし。実collectorを使う `--check` も既存coverage成果物とlizardで検証した。

## 独立レビュー修正

- `CollectorResult` を `ok` 判別unionへ修正し、例外をcollector境界でfaultへ変換した。
- CCNに `p50` / `p90` / `max` / `over_threshold` を追加し、閾値は既存exportを参照した。
- CLI verdictを `OK <件数> collectors <パス>`、`CHECK OK <件数> collectors`、`[CHECK ]FAILED [COLLECTOR: name]` に固定した。
- 全6 collectorのhappy path、JSON/git/lizard fault、tier分類、実CLI、10秒上限、非書込、連続生成、部分snapshot禁止を追加検証した。
- LOCは空文字を0行、末尾改行あり/なしとCRLFを論理行数どおり数えるpure helperへ修正した。
- 固定CCN recordで `p50=5` / `p90=9` / `over_threshold=1` の数値契約を検証した。

Iteration 2の再検証ではfocused unit 26件、integration 5件、typecheck、target lint、`git diff --check` がすべて成功した。
