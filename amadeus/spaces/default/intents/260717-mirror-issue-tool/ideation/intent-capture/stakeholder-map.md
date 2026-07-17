# Stakeholder Map — amadeus-mirror ツール

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし)

## Key Stakeholders(利害関係者と関心)

| ステークホルダー | 関心 |
|---|---|
| リポジトリオーナー(ユーザー) | intent-first 運用の定着、Issue の影の仕様書化防止、着手判断の主導権(issue-selection-user-decides) |
| amadeus conductor(ソロ/チームの実行エージェント) | 起票・同期・クローズの決定的な1コマンド化、close-after-landing の機械検査化 |
| 協働開発者(GitHub 閲覧者) | かんばんとしての Issue 一覧が常に最新状態を映すこと |
| レビュアー(record PR のクロスレビュー担当) | record 成果物の実測検証面が PR diff として与えられること |

## Decision-Makers vs Influencers(意思決定者と影響者)

- **意思決定者**: ユーザー — 着手・park/unpark・record PR マージ・close 呼び出しの可否
- **影響者**: conductor(運用の実行者として使い勝手をフィードバック)、レビュアー(record PR の verdict)

## Communication Requirements(コミュニケーション要件)

- ミラー Issue はタイトル+3〜5行概要+record リンク+状態行のみ(日本語、issues-in-japanese 準拠)
- 状態更新は intent の節目(park・phase 完了・complete)に sync 実行
- クロスレビューの verdict は record PR 上に残す(ミラー Issue には書かない)
