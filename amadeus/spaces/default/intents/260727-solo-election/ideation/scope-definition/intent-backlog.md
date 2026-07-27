# Intent Backlog — solo-election

上流入力(consumes 全数): intent-statement.md(Out of Scope)、feasibility-assessment.md(ギャップ一覧)、constraint-register.md(検証方法)を境界と後続候補の導出元に使用。

## 本 intent の後続候補(Won't からの繰り越し)

| 候補 | 内容 | 条件 |
|---|---|---|
| supervise 機能 | 最終要件未達時の判定+backward jump(judge subagent+戻り先解決+実行承認)。本セッションで議論済み・後回し裁定 | ユーザーが再開を指示したら intent 化 |
| ソロ定足数の再裁定 | 2体運用の実績(相関誤り率・エスカレーション率)を見て体数・モデル多様性必須化を再検討 | 運用実績が溜まった時点の PM/蒸留ラウンド |
| 発動類型の拡張 | 明確化質問など残る類型への拡張(Q1 で B 系を選択済み — 拡張は再裁定事項) | ユーザー裁定 |

## 起票済み共有面

- ミラー Issue [#1595](https://github.com/amadeus-dlc/amadeus/issues/1595) — 本 intent の一方向同期ミラー(record 正本)。節目で状態行を更新する。
