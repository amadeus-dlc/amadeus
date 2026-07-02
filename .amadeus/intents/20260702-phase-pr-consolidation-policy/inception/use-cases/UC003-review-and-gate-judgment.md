# UC003 統合 PR をレビューし gate を判定する

## ユースケース

Reviewer が統合 PR の記録から含まれる phase 成果物を判断し、Maintainer が merge を判断する。gate の判定は phase ごとに `state.json` で行われる。

## アクター

- ACT003 Reviewer
- ACT001 Maintainer

## 外部システム

- なし

## 事前条件

- 統合 PR の説明に、含まれる phase 成果物の一覧と各 phase の gate 状態が記録されている。
- development.md の PR 準備条件が、統合 PR では含まれる各 phase の成果物に適用されることが読める。

## 基本フロー

1. Reviewer は、PR 説明の記録から含まれる phase 成果物と gate 状態を確認する。
2. Reviewer は、validator の結果（phase ごとの state 検証）を確認する。
3. Maintainer は、記録と検証結果から merge を判断する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| 記録項目が不足している。 | 記録の補完を求め、merge を保留する。 |
| 特定 phase の成果物だけに差し戻しが必要になる。 | 統合 PR 内で該当成果物を補修する。gate は phase ごとに state で判定されるため、他 phase の判定は影響を受けない。 |

## 対応要求

- R003
- R004

## 未確認事項

- なし。
