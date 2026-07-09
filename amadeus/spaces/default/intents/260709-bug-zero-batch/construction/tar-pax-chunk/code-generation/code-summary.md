# Code Summary — tar-pax-chunk (#678)

## 実装

tar extractor(`extractTarGz`)が PAX(`x`/`g`)/GNU longname(`L`)拡張ヘッダのブロックを読んだ後、本体が gunzip チャンク境界を跨いで未着の場合に pending 状態を失い、次チャンクの本体を生ヘッダとして誤パースしていた不具合(#678)を修正。既存の `current`(通常ファイル本文の pending 状態)と同列に `pendingExtHeader`(typeflag/remaining/size/chunks)を追加し、次チャンク到着時に本体の続きから再開する。truncated archive 検出(`final` 時の `payloadInvalid`)は維持(AC-678-3)。

## 変更ファイル

- `packages/setup/src/internal/tar-archive-extractor.ts`(本修正)
- `tests/lib/setup-tar-fixture.ts`(PAX/GNU fixture helper — AC-678-4)
- `tests/lib/setup-codeload-fixture.ts`(新エントリ型対応)
- `tests/unit/setup-fetcher.test.ts`(回帰テスト3件: PAX/GNU チャンク跨ぎ+truncated)

## 検証(実測 exit code)

| 項目 | 結果 |
|---|---|
| 回帰テスト(修正前・extractor のみ revert) | exit 1(2 fail、`malformed tar header` — 落ちる実証) |
| 回帰テスト(修正後) | exit 0(13 pass) |
| typecheck / lint / dist:check / promote:self:check | すべて 0 |
| tests/run-tests.sh --ci | conductor 側で GitHub Actions により確認(PR CI) |

## PR

https://github.com/amadeus-dlc/amadeus/pull/690(Fixes #678)。core 未変更のため dist 同期は対象外(CR-2)。AC-678-1〜4 充足。
