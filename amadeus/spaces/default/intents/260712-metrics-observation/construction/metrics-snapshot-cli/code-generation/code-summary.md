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

- unit: 15件 pass。
- integration: 5件 pass。
- typecheck: pass。

## 計画逸脱

- rebase後に導入済みだったunit×Small ratchetとの交差により、計画でunitに置いていたcollectorの実FS/process境界は既存 `tests/integration/t221-metrics-snapshot.integration.test.ts` の実CLI検証へ集約した。`tests/unit/t221-metrics-snapshot-collectors.test.ts` にはpureなLOC・CCN集計契約を残し、高速unit価値を維持した。具体ファイル名は維持したがケースの境界配置が計画から変わった。allowlist追加は行っていない。

## 独立レビュー修正

- `CollectorResult` を `ok` 判別unionへ修正し、例外をcollector境界でfaultへ変換した。
- CCNに `p50` / `p90` / `max` / `over_threshold` を追加し、閾値は既存exportを参照した。
- CLI verdictを `OK <件数> collectors <パス>`、`CHECK OK <件数> collectors`、`[CHECK ]FAILED [COLLECTOR: name]` に固定した。
- 全6 collectorのhappy path、JSON/git/lizard fault、tier分類、実CLI、10秒上限、非書込、連続生成、部分snapshot禁止を追加検証した。
- LOCは空文字を0行、末尾改行あり/なしとCRLFを論理行数どおり数えるpure helperへ修正した。
- 固定CCN recordで `p50=5` / `p90=9` / `over_threshold=1` の数値契約を検証した。

rebase後の再検証ではfocused unit 15件、integration 5件、size drift、typecheck、lint、`git diff --check` がすべて成功した。

## Review — Iteration 2（rebase後・裁定A反映）

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-12

### Findings

- 前回NOT-READY後の是正を確認した。LOCは空文字0行、末尾改行あり・なし、CRLFをpure helperで数値固定し、CCNは固定recordから `p50=5`、`p90=9`、`max=20`、`over_threshold=1`、閾値15を数値で検証している。
- 実FS/processを使う6 collector、fault、atomic write、連続生成、10秒上限はintegrationへ集約され、unitにはLOC/CCNのpure契約のみが残る。裁定AのSmall purityと高速unit価値を両立し、allowlistは変更していない。
- Blocking findingなし。collector判別union、全6 collector、loud-fail、16KB上限、非書込check、部分snapshot禁止の契約はfocused検証で維持されている。

### 検証結果

- focused（t221を含む全対象）: 44 pass / 0 fail。
- size purity (`tests/unit/t-test-size-drift.test.ts`): 16 pass / 0 fail。allowlist差分なし。
- `git diff --check`: pass。正準full CIはconductor実測exit 0を確認済み。

### 残存リスク

- lizard、git、coverage成果物という実行環境依存はintegrationで検証されるが、外部tool出力形式の将来変更時にはcollector契約更新が必要になる。
