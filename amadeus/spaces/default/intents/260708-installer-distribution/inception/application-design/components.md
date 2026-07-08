# Components — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: application-design (2.6) / 作成: 2026-07-08
> 上流入力: `../requirements-analysis/requirements.md`(FR-001〜018)、`../user-stories/stories.md`(US-A/B/C)、codekb `architecture.md`・`component-inventory.md`、`../practices-discovery/team-practices.md`
> 決定の出典: `application-design-questions.md` Q1(8モジュール分割)

## 全体像

`packages/setup` は単一の公開パッケージで、内部を責務ごとの8モジュールに分割する。「プラン=データ、適用=実行」の分離を中核とし、dry-run・差分レポート(FR-007)・`--force` 監査(FR-009)を planner の純粋な出力として実現する。各モジュールは狭い公開 API(数関数)のみを晒し、実装詳細を隠蔽する(深いモジュール方針、inception フェーズルール)。

## モジュール一覧

### cli
- **責務**: 引数解析、ヘルプ表示(サブコマンドなし時)、サブコマンドディスパッチ、対話ウィザード(ハーネス選択・確認)、TTY/非対話判定
- **境界**: 入出力(stdin/stdout/exit code)を所有する唯一のモジュール。他モジュールは I/O を行わず値を返す(reporter の描画文字列も cli 経由で出力)
- **主な FR**: CLI Contract、FR-003、FR-010、FR-011 / US-A2・A3・A5

### resolver
- **責務**: バージョン解決 — GitHub Release/タグ一覧の取得、SemVer パースと順序付け、プレリリース/ドラフト除外、`--version` 完全一致
- **境界**: 「どの `vX.Y.Z` を使うか」の決定のみ。ダウンロードは fetcher
- **主な FR**: FR-006 / US-B5

### fetcher
- **責務**: タグアーカイブ(tar.gz)のダウンロードと展開、1回自動リトライ、失敗の原因分類(DNS/接続/HTTP/rate-limit)
- **境界**: ネットワーク I/O を所有する唯一のモジュール(resolver の API 呼び出しも fetcher の HTTP 基盤を使う)
- **主な FR**: FR-006、FR-012 / US-A7

### planner
- **責務**: install/upgrade プランの作成 — 配布物と対象の走査、ファイル分類(`owned`/`shared`/`user-preserved`)、マニフェスト期待 md5 との照合、導入済み検出、バージョン境界判定、差分エントリ(add/update/skip/backup/conflict)生成
- **境界**: 純粋関数的(ファイル読み取りのみ、書き込みなし)。プランはデータとして返る
- **主な FR**: FR-004、FR-005、FR-007、FR-008 / US-A4・B1・B2・B4

### applier
- **責務**: プランの実行 — コピー、`$namefile.$timestamp.bk` 退避(単一操作タイムスタンプ)、force 印付けの反映
- **境界**: 対象プロジェクトへの書き込みを所有する唯一のモジュール。プランにない操作は行わない
- **主な FR**: FR-008、FR-009 / US-B3

### manifest
- **責務**: `amadeus/.installer/amadeus-setup-manifest.json` の読み書き、スキーマ検証(schemaVersion、files[] の path/class/required/md5)
- **境界**: 永続状態(マニフェスト)を知る唯一のモジュール
- **主な FR**: FR-016 / US-B1

### verifier
- **責務**: 導入後検証 — マニフェスト由来の必須ファイル存在検証、doctor 相当の起動前提チェック
- **主な FR**: FR-013 / US-A6

### reporter
- **責務**: 差分レポート・エラーメッセージ・完了案内・ネクストステップの整形(描画文字列の生成。出力は cli)
- **主な FR**: FR-007、FR-012 / US-A6・A7・B2

## パッケージ境界とレイアウト

```
packages/setup/
  package.json        # @amadeus-dlc/setup, bin: amadeus-setup -> dist/cli.js
  src/                # TypeScript ソース(8モジュール)
  dist/cli.js         # bun build 単一バンドル(ADR-002)— publish 対象
  README.md, LICENSE-MIT, LICENSE-APACHE
```

- `packages/framework` へのコード依存なし(ADR-001: promote-self は設計参照のみ)
- 消費するのは**ビルド済み配布物**(GitHub タグアーカイブ内の `dist/<harness>/`)であり、manifest.ts のソース契約ではない(codekb `component-inventory.md` の整理どおり)
