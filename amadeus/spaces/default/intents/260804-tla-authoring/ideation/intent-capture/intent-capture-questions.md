# Intent Capture 質問記録

## 対話モード

- 選択: `Guide me`
- 質問予算: 最大8問（Standard depth）
- 実施した追加質問: 0問

## 追加質問なしの根拠

[Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161) が問題、対象利用者、発生契機、成功条件8項目、非スコープ、`self-feature` の指定を明示している。ユーザーも本Intentを `self-feature` として開始するよう明示した。既決事項を再質問せず、未決の解決方式（新規stageか既存stageへのoverlayか）は後続のRequirements AnalysisとApplication Designで比較・決定する。

## 完全性確認

- 空の回答タグ: なし
- 未解決のIntent Capture判断: なし
- 後続stageへ委ねる判断: authoring責務の配置方式と強制機構
