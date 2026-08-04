# Requirements Analysis 質問 — 260803-pi-harness

> E-OC1 証跡: 全2問ともユーザー本人のHUMAN_TURN直接回答。合意サマリのユーザー承認タイムスタンプ: 2026-08-03T09:26:59Z（「1」= 確認OK）
> モード: Guide me（対話式）
> 上流入力: `intent-statement`、`scope-document`、CodeKBの`business-overview`、`architecture`、`code-structure`を採用。`team-practices`成果物は本workflowでskipされ未生成
> 既に確定している事項（再質問しない）:
> - 正式対象はPi Coding Agent 0.83.0以上。Agent Core単体SDKは対象外
> - setup CLI + Pi Package local/git、全subagent経路、TUI dogfood、print/RPC live journeyをMustとする
> - npm registryへの実公開、Pi一般機能、未証明の旧版互換は対象外
> - project trustを迂回せず、generated `dist/`を手編集しない

## Q1. 必須能力が欠落・非互換な場合の実行方針

Pi extension、HUMAN_TURN、継続制御、subagentなどの正式対応能力が欠ける環境で、workflowをどこまで継続させるか。

- A. workflow変更能力はfail-closed（推奨）: gate、audit、state、continuation、subagentの必須契約が欠けたら実行を停止し、doctor/statusなどのread-only診断だけを許可する。single-agentへの無音縮退は禁止
- B. subagentだけ縮退: gate、audit、state、continuationはfail-closedだが、subagent欠落時は警告付きsingle-agent実行を許可する
- C. advisory継続: 欠落能力を警告し、可能な範囲でworkflowを継続する
- X. Other（自由記述）

[Answer]: A — workflow変更能力はfail-closed。gate、audit、state、continuation、subagentの必須契約が欠けたら停止し、doctor/statusなどread-only診断だけを許可する。single-agentへの無音縮退は禁止（2026-08-03、Guide me）

## Q2. 初回正式対応のOS保証範囲

Amadeus core/test suiteはmacOS、Linux、native Windowsを対象とする一方、rendered TUI live journeyは既存方針でもWindows非対応である。Pi正式対応をどの範囲で保証するか。

- A. 3 OSのcore契約 + live TUIはmacOS/Linux（推奨）: install、doctor、決定的test、print/RPC、subagentをmacOS/Linux/native Windowsで保証し、tmux等を要するrendered TUI live journeyだけWindowsでは明示skipする
- B. macOS/Linuxのみ: Pi正式対応全体をmacOS/Linuxに限定し、native Windowsは後続intentへ送る
- C. macOSのみ: 今回のdogfood環境だけを正式保証し、他OSは未対応とする
- X. Other（自由記述）

[Answer]: B — macOS/Linuxのみ。Pi正式対応全体をmacOS/Linuxに限定し、native Windowsは後続intentへ送る（2026-08-03、Guide me）
