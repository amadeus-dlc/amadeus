# Intent Capture 質問 — 260803-pi-harness

> E-OC1 証跡: 全2問ともユーザー本人のHUMAN_TURN直接回答。合意サマリのユーザー承認タイムスタンプ: 2026-08-03T07:49:04Z（「1」= 確認OK）
> モード: Guide me（対話式）
> 既に確定している事項（再質問しない）:
> - 正式対応対象は `@earendil-works/pi-coding-agent` のCLIハーネス。`@earendil-works/pi-agent-core` 単体の埋め込みAPI対応ではない
> - Piネイティブskill、extension lifecycle adapter、subagent実行、installer、doctor、配布物、文書、適合テストを実装する
> - `self-feature` として既存コアを変更せず、ハーネス境界へ閉じた追加実装にする
> - Pi 0.83.0で、プロジェクトの `AGENTS.md` と `.agents/skills/amadeus` の検出、およびBun製決定論エンジンの起動は確認済み
> - Pi 0.83.0は `session_start`、`session_shutdown`、`session_compact`、`input`、`agent_start`、`agent_end`、`agent_settled`、`tool_call` などのextension eventと、Pi Packageによるskills/extensions配布を提供する
> - 最低対応版は、必要event surfaceが実測済みの Pi 0.83.0 とする。より古い版の互換性は設計・テストで証明できた場合だけ広げる

## Q1. 正式な配布チャネル

Piは `pi install npm:...` / `pi install git:...` と、プロジェクトローカルの `pi install -l` をネイティブに提供する。一方、Amadeusには既存の setup CLI と `dist/<harness>/` 配布契約がある。どこまでを今回の正式契約に含めるか。

- A. 二重チャネル（推奨）: 既存 setup CLI の `--harness pi` を正本としつつ、同じ生成物をPi Packageとしても `pi install -l` 可能にする。両経路のparityをテストする
- B. setup CLIのみ: `dist/pi` と既存installerだけを正式対応し、Pi Package化は後続intentにする
- C. Pi Packageのみ: Piネイティブ配布に一本化し、既存setup CLIには追加しない
- X. Other（自由記述）

[Answer]: A — 二重チャネル。既存setup CLIの `--harness pi` を正本とし、同一生成物をPi Packageとして `pi install -l` 可能にする。両経路のparityをテストする（2026-08-03、Guide me）

## Q2. 正式対応を名乗るための実機検証範囲

決定的なadapter・packaging・doctorテストに加えて、どのPi実機経路までを完了条件にするか。

- A. dogfood + live journey（推奨）: セルフインストール後、対話TUIで `/skill:amadeus`、extension event、human gate、doctor、subagentを実走し、さらに `pi -p` またはRPCによる自動live journeyを少なくとも1本追加する
- B. dogfoodまで: 対話TUIの手動実走までは必須とし、自動live journeyは後続intentにする
- C. 決定的テストまで: 実機セッションは任意確認に留める
- X. Other（自由記述）

[Answer]: A — dogfood + live journey。TUIでskill、extension event、human gate、doctor、subagentを実走し、`pi -p` またはRPCによる自動live journeyを少なくとも1本追加する（2026-08-03、Guide me）
