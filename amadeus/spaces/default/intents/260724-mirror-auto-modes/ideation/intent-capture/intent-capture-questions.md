# Intent Capture — Questions

> E-OC1 証跡: 全6問はユーザー対話モード（leader セッションの実 HUMAN_TURN）で直接裁定された。leader 承認: 2026-07-24T02:07:01Z（最終回答の受領と同時に記入）。

## Interaction Mode

このステージでは、既存の `mirror-productization` Intent と今回の会話を前提に、約5〜8件の確認事項を扱います。どの方法で回答しますか。

- A. Guide me — 質問を順番に対話形式で進める
- B. Grill me — 推奨案と根拠を添えて、一問ずつ深掘りする
- C. I'll edit the file — 質問ファイルを自分で編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: D — Chat
[Answered At]: 2026-07-24T01:55:22Z
[Mode]: chat

## 確定事項

`auto-mirror` は boolean ではなく、次の3値を取る設定に変更する。

- `off`: create・sync・close を実行しない
- `prompt`: create・sync・close の各操作前に確認する
- `auto`: 安全ガード付きで create・sync・close を自動実行する

[Source]: ユーザーとの事前合意、および 2026-07-24T01:57:12Z の回答

## Q1. 旧 boolean 設定の扱い

新仕様の3値とは別に、既存の `"auto-mirror": true | false` を読み込んだ場合だけ決める必要があります。どの扱いにしますか。

- A. 移行期間中は受理し、`true → auto`、`false → prompt` に読み替える。未指定時は `prompt`（推奨: 現行挙動を維持）
- B. boolean は直ちに設定エラーとする。未指定時は `prompt`
- C. boolean は直ちに設定エラーとする。未指定時は `off`
- X. Other (please specify)

[Answer]: 旧 boolean は受理せず、設定エラーとする。互換性は維持しない。
[Answered At]: 2026-07-24T01:59:38Z

## Q2. 未指定時の既定値

`auto-mirror` を設定していない場合、どのモードとして扱いますか。

- A. `prompt`（推奨: 操作前に確認するため、意図しない GitHub 書き込みを避けつつミラー機能を案内できる）
- B. `off`（明示的に有効化するまで、ミラー機能は一切動作しない）
- X. Other (please specify)

[Answer]: A — `prompt`
[Answered At]: 2026-07-24T02:00:21Z

## Q3. `auto` で Issue を作成するタイミング

Intent の説明は Intent Capture 中に変わり得ます。`auto` の場合、GitHub Issue をいつ作成しますか。

- A. Intent Capture の承認直後（推奨: 内容が合意されてから作成し、未確定・破棄された Intent の Issue を避ける）
- B. Intent 作成直後（最も早く他の開発者へ可視化できる）
- C. Ideation phase の完了時（内容は安定するが、可視化が遅れる）
- X. Other (please specify)

[Answer]: A — Intent Capture の承認直後
[Answered At]: 2026-07-24T02:04:15Z

## Q4. `auto` で Issue を同期するタイミング

作成後の GitHub Issue を、どの境界で自動更新しますか。

- A. 各 phase の完了時、park 時、workflow 完了時（推奨: 意味のあるチェックポイントを反映し、API 呼び出しとノイズを抑える）
- B. 各 stage の完了時、park 時、workflow 完了時（最も新鮮だが更新頻度が高い）
- C. 各 phase の完了時と workflow 完了時（park 中の状態は反映しない）
- X. Other (please specify)

[Answer]: A — 各 phase の完了時、park 時、workflow 完了時
[Answered At]: 2026-07-24T02:05:03Z

## Q5. `auto` で Issue を close する安全条件

Workflow 完了時に、どの GitHub Issue を自動 close してよいですか。

- A. Amadeus がこの Intent 用に作成した Issue のみ、最終同期成功後に close する（推奨: 外部で作成・流用された Issue を誤って閉じない）
- B. 作成元を問わず、この Intent にリンクされた Issue を最終同期成功後に close する
- C. `auto` でも close だけは確認する
- X. Other (please specify)

[Answer]: A — Amadeus がこの Intent 用に作成した Issue のみ、最終同期成功後に close する
[Answered At]: 2026-07-24T02:06:25Z

## Q6. GitHub 操作失敗時の扱い

`auto` の create・sync・close が、未認証、通信障害、権限不足などで失敗した場合、Workflow をどう扱いますか。

- A. Workflow は継続し、未同期状態と警告を記録して次の境界で再試行する（推奨: GitHub 障害を開発停止にせず、失敗を不可視にもせず回復できる）
- B. GitHub 操作が成功するまで Workflow の進行を停止する
- C. その Intent では自動的に `prompt` へ切り替える
- X. Other (please specify)

[Answer]: A — Workflow は継続し、未同期状態と警告を記録して次の境界で再試行する
[Answered At]: 2026-07-24T02:07:01Z
