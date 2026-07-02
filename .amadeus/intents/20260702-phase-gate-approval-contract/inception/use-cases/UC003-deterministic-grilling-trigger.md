# UC003 決定論的トリガーで grilling を起動する

## ユースケース

Agent が phase skill の起動時に前段 phase 必須成果物の未確定事項を読み、文言規約による判定で grilling を起動する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 前段 phase の必須成果物（`未確定事項` または `未確認事項` 見出しを持つ）が読める。

## 基本フロー

1. Agent は、phase skill（ideation、inception、construction）の decision review で、前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しを読む。
2. Agent は、「<現在 phase> で判断する」を含む項目を数える。
3. 該当項目が 1 件以上残っている場合、Agent は outcome を `grill_required` とし、該当項目を `amadeus-grilling` の作法で一問ずつ確認する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| 該当項目が 0 件である。 | 通常の decision review の判断を続ける。 |
| 該当項目が調査（既存成果物、実データの確認）で解消できる。 | 調査で解消した根拠を記録し、残った項目だけを質問する。 |

## 対応要求

- R002

## 未確認事項

- なし。
