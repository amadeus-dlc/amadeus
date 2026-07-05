# Integration Test Instructions

Unit: agmsg-trial-docs（Test Strategy: Minimal、docs 系 refactor）

## 適用判断

コード統合点（API、DB、外部サービス）は存在しないため、コード統合テストは不適用。本 Intent の「統合」に相当するのは 4 体連携プロトコルの実働検証であり、それは本 Intent の実行過程そのもの（承認経路の一貫動作、ピア協議 2 回の成立、HUMAN_TURN mint 規律）が兼ねる。

## 検証内容

| 統合点 | 検証 | 証跡 |
|---|---|---|
| 承認経路（人間 → leader → engineer1） | ディスパッチ受信から gate 承認中継 3 回まで一貫動作 | multi-agent-trial-record.md 節 3.1、audit の HUMAN_TURN / DECISION_RECORDED |
| ピア協議 | 2 回とも 3 宛全員が期限 15 分内に回答 | 同節 3.1 の観測時刻 |
| HUMAN_TURN mint 規律 | 中継承認定型文の受信時だけ mint（ピア回答では mint なし） | audit shard の HUMAN_TURN イベント時刻と受信時刻の対応（#497 受け入れ条件） |
