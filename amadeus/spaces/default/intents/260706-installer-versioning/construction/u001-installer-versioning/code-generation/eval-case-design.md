# Eval Case Design — u001-installer-versioning（260706-installer-versioning）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（判定表 + B001/B002 手順）、[requirements.md](../../../inception/requirements-analysis/requirements.md)（FR-5.1 (a)〜(h) + 追補 (i)）、refined-mockups の mockups.md（期待文字列の正）

window 待機中の非接触準備（leader 調停 2026-07-06T11:03:01Z の許可範囲）。dev-scripts/evals/installer/check.ts へ追加する assertion の設計。path は restructure 後の対応表受領時に読み替える。

## B001 で追加（先行 RED）

| # | ケース | assertion 観点 |
|---|---|---|
| a-1 | 初回導入成功 | `.amadeus-install.json` が存在し、JSON parse 可能、キーが 4 個ちょうど |
| a-2 | manifest 内容一致 | files の各エントリが実ファイルの sha256 と一致（全件）。AMADEUS.md は変換後の値、settings.json は merge 後の値 |
| a-3 | files の網羅と除外 | コピー対象全ファイルが files に載る。manifest 自身・退避 dir 由来の path が載らない（(g) の B001 分） |
| a-4 | files 辞書順 | JSON テキスト上でキーが辞書順 |
| a-5 | sourceCommit | 40 桁 hex（テスト repo は git 有）。installedAt が ISO 8601 |
| e-1 | --version-info 正常系 | exit 0、stdout 1 行に commit 先頭 8 桁・installedAt・追跡数 |
| e-2 | --version-info 不在系 | exit 1、stderr に no install manifest + fix: 行 |
| e-3 | --version-info 単独 | exit 1、stderr に usage |
| e-4 | previous install found | 2 回目実行の stdout に previous install found (commit <c8>, ...) 行 |
| 互換 | 既存 274 assertion | 全 GREEN（従来出力・挙動の互換。B001 gate 条件） |

## B002 で追加（先行 RED）

| # | ケース | assertion 観点 |
|---|---|---|
| b-1 | 改変 → 退避 → 上書き | 改変ファイルが新内容になり、退避物（時刻 dir 配下の相対 path）の内容 = 改変版 |
| b-2 | 退避告知 | summary ヘッダ件数 = 列挙行数 = 退避総数。ステップ行 detail に件数 |
| c-1 | 未改変 → 上書き（無告知） | 退避行・restored 行なし、出力が従来同一 |
| c-2 | 削除 → restored | ファイル再作成 + restored 件数行 |
| c-3 | bootstrap | manifest 削除後の再実行で、差分ファイルが退避され bootstrap 告知行が出る |
| d-1 | 冪等 | 同一配布物で再実行 → 退避 0、出力従来同一、manifest 同値 |
| f-1 | (b-2 と統合可) 告知の文字列一致 | mockups.md の確定文字列と一致 |
| g-1 | 除外の維持 | 退避発生後も manifest に退避 dir 配下が載らない |
| h-1 | 廃止 + 改変 | 旧 manifest にあり新配布物に無いファイル（改変済み）が退避されてから消え、obsolete 内数行が出る |
| h-2 | 廃止 + 未改変 | 退避されず消える（従来収束） |
| i-1 | 途中失敗 → 再実行 | 1 回目を故意に途中失敗させ（例: smoke 対象を壊す）、2 回目で退避 0 件（グローバル優先規則） |
| sec-1 | recorded path 検証 | manifest の files キーに `../evil` を注入 → InstallError（fix: 付き）で停止し、target 外に書き込みがない |

## 判定表のテスト観点（純関数 judge の表引き）

判定表 6 行 + グローバル優先規則を、(recorded, currentHash, newHash) の組で全行直接検証する unit 的 assertion 群（eval 内の純関数テストとして実装。ファイルシステム不要）。

## 実装メモ

- 既存 eval の隔離 workspace 生成・実行ヘルパを流用（DR-3）。
- 期待文字列は mockups.md 第 2〜3 節から転記し、実装とテストの正を一本化する。
- assertion 総数見込み: B001 で +10 前後、B002 で +14 前後（既存 274 → 約 298）。
