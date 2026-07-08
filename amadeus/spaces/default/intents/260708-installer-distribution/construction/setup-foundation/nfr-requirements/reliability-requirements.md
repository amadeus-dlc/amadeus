# Reliability Requirements — setup-foundation

> ステージ: nfr-requirements (3.2) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-F06〜F15)、requirements FR-012/NFR-002

## REL-F01: 失敗時のファイル無変更保証

resolver / fetcher の失敗(ResolveError / FetchError)時、対象プロジェクトのファイルは一切変更されない(取得・展開は一時領域のみで完結し、適用は U2/U3 の applier だけが行う)。

## REL-F02: リトライ境界の決定性

一時的失敗の自動リトライはちょうど1回(BR-F06)。リトライ対象の判定は `e.isTransient()` に集約され、テストで全分類の網羅を検証する。

## REL-F03: 展開物の完全性検証

`ExtractedPayload.locate` が dist/<harness> アンカーを検証し(BR-F10)、SEC-F01 の経路検証と併せて「壊れた/危険な payload で先へ進まない」ことを保証。

## REL-F04: マニフェストの後方互換読み取り

未知の schemaVersion は読み取り拒否(BR-F12 — 誤解釈して進むより明示的に停止)。マニフェスト不在は正常系(BR-F15)。

## REL-F05: バックアップファイル名のプラットフォーム安全性(NFR-004 / Windows)

`$namefile.$timestamp.bk` の `$timestamp` は **ISO 8601 basic 形式(コロンなし: `YYYYMMDDTHHmmssZ`、例 `20260708T120000Z`)** を用いる。標準の拡張形式(`2026-07-08T12:00:00Z`)はコロンを含み **Windows NTFS のファイル名予約文字に抵触**するため、ファイル名トークンとしては使用しない。

- `Manifest.installedAt`(永続 JSON 内)は従来どおり拡張 ISO 8601 のまま — **同一瞬間の2表現**であり、`installedAt` と `$timestamp` は相互導出可能(BR-F14 の「同一値」は「同一瞬間」を指すと明確化)
- 検証: バックアップ名生成のユニットテストに Windows 予約文字(`: * ? " < > |`)不含アサートを含める(NFR-004 検証条項)

## 可観測性(CLI 相当)

- すべての失敗は分類付きで stderr に出力され、終了コードで機械判別可能(BR-I06 系)
- 「1つのヘルスメトリクス+1つのエラーレートメトリクス」相当は、E2E スモーク(導入成功)+ エラー分類テストが担う(operation フェーズの常駐監視は対象外 — scope SKIP と整合)
