# インテント：共有インデックスの生成物化

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | 共有インデックス `intents.md` と `discoveries.md` の手動更新を、配下モジュールからの決定論的な再生成へ置き換える技術目標である。 |
| scope | refactor | 既存の共有インデックス更新手順を、生成物としての再生成へ置き換える Intent である。 |
| labels | shared-index, index-generation, parallel-execution, validator, self-development | 共有インデックス、インデックス生成、並行実行、validator、自己開発を表す。 |

## 目的

並行する複数 branch が共有インデックスの手動コンフリクト解消なしに統合できるように、`.amadeus/intents.md` と `.amadeus/discoveries.md` を配下モジュールからの決定論的な生成物にする。

この Intent は [Issue #334](https://github.com/amadeus-dlc/amadeus/issues/334) と Discovery [20260702-parallel-execution](../discoveries/20260702-parallel-execution.md) の recommended 候補を根拠にする。

すべての Intent が `intents.md` を、すべての Discovery が `discoveries.md` を更新するため、並行 branch 間で共有インデックスの追記衝突が起き、水平並行の構造的な障害になっている。

## 成功条件

- `intents.md` と `discoveries.md` が配下モジュールから決定論的に再生成できる。
- 並行 branch の統合で、共有インデックスの手動コンフリクト解消が不要になる。
- インデックスと配下モジュールの不整合を validator が fail にする。
- 生成の入口が配布先ユーザー環境（repo root の開発用スクリプトなし）で実行できる。

## 範囲

含めるもの:

- `intents.md` と `discoveries.md` を配下モジュールから再生成する手段。
- インデックスと配下モジュールの不整合検査。
- 再生成の決定論性を確認する eval または決定論的検証の先行追加。

含めないもの:

- `glossary.md`、`domain-map.md`、`context-map.md` の生成物化。
- repo 開発用 `CONTEXT.md`。
- 並行実行の他候補（ゲート待ちキューの可視化、並行運用ポリシー、Bolt の依存 wave 並行実行）。

## 現在の phase

Ideation を開始する。

Inception では、インデックスに残す情報と配下モジュールへ移す情報の境界、依存関係表の扱い、生成入口の配置先、validator の検査契約を具体化する。
