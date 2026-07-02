# Business Logic Model

## 目的

共有インデックス `intents.md` と `discoveries.md` の更新を、配下モジュールからの決定論的な再生成として行えるようにする。

## 対象 Unit

U001 共有インデックス生成契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | `intents/*.md` の見出し契約（`## 概要` と `## 依存` の表）から、`intents.md` の一覧行（識別子、概要、依存、詳細）を導出する。`state.json` は使わない。 | Intent モジュールファイル | intents.md の一覧行 | R001, R002, UC001 |
| BL002 | 各 Intent モジュールの `## 依存` 表（依存、理由）から、`intents.md` の依存関係表（インテント、依存、理由）を導出する。依存が `なし` の行も含める。 | Intent モジュールファイル | intents.md の依存関係表 | R001, R002, UC001 |
| BL003 | `discoveries/*.md` の H1（末尾の「 Discovery Brief」を除去した値をテーマとする）、`## 推奨次アクション` の箇条書き、各 `state.json` の `status` と `decision` から、`discoveries.md` の一覧行を導出する。 | Discovery モジュールファイル、state.json | discoveries.md の一覧行 | R001, R002, UC001 |
| BL004 | 行を識別子の辞書順（`YYYYMMDD-<slug>` の昇順）で並べ、ファイル先頭に生成マーカーを付けて出力する。 | 導出済みの行 | intents.md、discoveries.md | R002, R003, UC001 |
| BL005 | 見出し契約を満たさないモジュールがある場合、対象ファイルと不足している見出しを示して失敗する。 | Intent モジュールファイル | エラー報告 | R001, UC001 |
| BL006 | 不整合検査は生成ロジックを再利用し、導出した期待内容と実ファイルの完全一致（マーカーを含む）で判定する。不一致は対象と理由を fail として報告する。 | 実ファイル、導出した期待内容 | 検査結果 | R004, UC003 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| workspace の path | `.amadeus/` を持つ対象 workspace の特定に使う。 | R002 |
| `intents/*.md` と `discoveries/*.md` | 一覧行と依存関係表の情報源。 | R001 |
| `discoveries/*/state.json` | Discovery の状態と判定の情報源。Intent の行の導出には `state.json` を使わない。 | R001 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| 生成された `intents.md` と `discoveries.md` | 先頭マーカー付き。生成直後に validator がインデックスに起因する fail を出さない状態。 | Agent、Reviewer、validator |
| 検査結果 | 完全一致の成否と、不一致の場合の対象と理由。 | validator の報告 |

## 未確認事項

なし。
