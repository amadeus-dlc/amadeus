上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Rules — kimi-hook-adapter

requirements.md の FR-2 と components.md C2、component-methods.md の C2 インターフェースから導出する不変条件。

## 変換の不変条件

- BR-1: core hooks は一切改変しない(byte-shared を維持)。変換は全て lib 内に閉じる(09-porting の adapter 規約)
- BR-2: 全経路 fail-open。adapter スクリプトの例外・core hook 不在・未知イベント/フィールドで、ユーザーの Kimi セッションを止めない(exit 0)
- BR-3: Stop block の中継だけは core hook の出力を verbatim に扱う(改変しない。`{"decision":"block","reason"}` → Kimi の block 契約: exit 2 + stderr、または `hookSpecificOutput` — どちらが正契約かは live capture で確定)
- BR-4: presence mint は「実際に人間が応答したターン」に限る。UserPromptSubmit の機械注入(マーカー判定)は core 側の既存分類器に委譲し、adapter 側で独自判定を持たない
- BR-5: payload 変換表は live capture の実機値で固定し、docs 記載と実機が乖離する場合は実機を優先する(FR-2b)。docs のみに存在するフィールドを参照しない
- BR-6: Windows 考慮は既存ハーネスと同等(FR-2d): bun 直実行・実行ビット不要・ポータブルなパス処理(path.join・UNC 回避)
- BR-7: capture/probe はユーザーの config に残さない。作業後は managed block のみが除去されることをバックアップとの diff で確認する(Q1 手順)

## イベント ↔ target 対応(骨格。live capture で確定)

| Kimi イベント | matcher | adapter target |
|---|---|---|
| SessionStart | startup\|resume | session-start |
| SessionEnd | exit | session-end |
| UserPromptSubmit | — | mint |
| PostToolUse | Write\|Edit | audit-and-sensors |
| PostToolUse | AskUserQuestion | mint |
| PostToolUse | TodoList | state-sync |
| PostToolUse | Bash | runtime-compile |
| PreCompact | manual\|auto | validate-state |
| SubagentStop | — | log-subagent |
| Stop | — | stop |

骨格の7イベント種が adapter の9 target に写る対応は、U1 の domain-entities.md の突合注記を本 Unit で確定する。現在の突合: 7イベント種(SessionStart/SessionEnd/UserPromptSubmit/PostToolUse/PreCompact/SubagentStop/Stop)のうち PostToolUse が matcher で4 target(audit-and-sensors・mint・state-sync・runtime-compile)に分岐し、UserPromptSubmit と PostToolUse(AskUserQuestion)が mint を共有するため、表の10行が9 target に写る。

## 適用範囲

- U2 の完了定義(unit-of-work.md)と FR 対応(unit-of-work-story-map.md の FR-2/FR-7a 行)に適用する
- requirements.md の FR-2(特に FR-2b の実機優先・FR-2c の fail-open)が本ファイルのルールの根拠
- services.md の判定(常駐サービスなし・adapter は無状態)により、rules は全てリクエスト単位の不変条件とする
