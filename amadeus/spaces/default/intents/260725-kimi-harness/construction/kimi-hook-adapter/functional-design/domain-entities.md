上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Domain Entities — kimi-hook-adapter

requirements.md の FR-2 と components.md C2、component-methods.md の C2 インターフェースをエンティティとして定義する。

## Entity: KimiHookPayload(入力)

- ベース形(docs 実測): `{ hook_event_name, session_id, cwd }` + イベント別フィールド(snake_case)
- イベント別の正確なフィールドは live capture で確定(下記 Capture Fixture に記録)
- `tool_input` の形状はツール別(Bash.command / Write|Edit.file_path / TodoList.todos / AskUserQuestion.questions)

## Entity: ClaudePayload(正常形)

- core hooks が消費する Claude 型 stdin。`normalizePayload` の出力先
- イベント別の写像表は lib に固定(live capture 由来)

## Entity: AdapterTarget(列挙)

`session-start | session-end | mint | audit-and-sensors | state-sync | runtime-compile | validate-state | log-subagent | stop` の9値。`routeTarget` が解決し、未知値は fail-open(空の呼出列)

## Entity: CoreHookCall(呼出仕様)

- `{ hookPath: string; stdin: ClaudePayload; translate: "none" | "session-start" | "stop" }`
- adapter が lib から受け取り subprocess 化する最小単位

## Entity: Capture Fixture(検証資産)

- live capture で採取した実機 payload を `tests/fixtures/kimi-hooks/<event>.json` として保存(手書き合成しない)
- 契約テストは fixture を lib に流して core hook 効果を断言する

## 適用範囲

- U2 の完了定義(unit-of-work.md)と unit-of-work-story-map.md の FR-2/FR-7a 行に対応するエンティティ
- requirements.md の FR-2 の分解先として定義する
- services.md の判定(常駐サービスなし)により、エンティティ間の共有状態は導入しない

## 関係

- KimiHookPayload --normalizePayload--> ClaudePayload --(subprocess)--> core hook --translate--> Kimi 契約(exit/stdout)
- Capture Fixture --契約テスト--> 写像表の回帰防止
