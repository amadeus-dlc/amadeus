# Scope Definition — Questions

> 上流入力（consumes 全数）: `intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`

## Interaction Mode

既決事項からMust/Won’tの境界は導出できます。新たな確認事項は、proto-Unit backlogの優先順1件です。どの方法で回答しますか。

- A. Guide me — 質問を順番に対話形式で進める
- B. Grill me — 推奨案と根拠を添えて、一問ずつ深掘りする
- C. I'll edit the file — 質問ファイルを自分で編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: D — Chat
[Answered At]: 2026-07-24T02:18:51Z
[Mode]: chat

## E-OC1 証跡

> E-OC1 証跡: Q1はdelivery sequencingの価値判断であるため、ユーザー対話モード（leaderセッションの実HUMAN_TURN）で直接裁定された。leader承認: 2026-07-24T02:19:40Z。

## Q1. 最初のwalking skeleton

最初のproto-Unitで、どのend-to-end価値とリスクを実証しますか。

- A. `auto`設定→Intent Capture承認後のcreate→provenance保存→部分失敗後の重複なし再試行までを貫通させる（推奨: 最大リスク2件を最初に閉じ、他のsync/closeが依存できる）
- B. 3モードの設定parse・3層解決だけを先に完成させる（依存基盤は早いが、外部操作の価値とリスクを実証しない）
- C. 既存Issueのauto sync・closeを先に完成させ、auto createは後回しにする（早く見えるが、名称とライフサイクルの不一致が一時的に残る）
- X. Other (please specify)

[Answer]: A — `auto`設定からIntent Capture承認後のcreate、provenance保存、部分失敗後の重複なし再試行までを貫通させる
[Answered At]: 2026-07-24T02:19:40Z
