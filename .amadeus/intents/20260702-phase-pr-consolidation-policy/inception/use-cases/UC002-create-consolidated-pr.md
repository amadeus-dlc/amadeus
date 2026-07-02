# UC002 統合 PR を作成して記録する

## ユースケース

Agent が仕様側の phase 成果物を 1 branch にまとめて PR 化し、含まれる phase 成果物と gate 状態を PR 説明に記録する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- UC001 で統合が許可されている。
- 仕様側の各 phase 成果物が validator で pass している。

## 基本フロー

1. Agent は、`codex/issue-<n>-specification` の命名で統合 branch を作る。
2. Agent は、仕様側（Discovery〜Inception）の成果物を同じ branch で作成し、phase ごとに `state.json` の gate を確定する。
3. Agent は、PR 説明に含まれる phase 成果物の一覧と各 phase の gate 状態を明記して PR を作成する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| 途中の phase で grilling が必要な未確定事項が見つかる。 | 統合条件を満たさなくなるため、その phase までで PR を区切り、以降は既定に戻る。 |

## 対応要求

- R002
- R003

## 未確認事項

- なし。
