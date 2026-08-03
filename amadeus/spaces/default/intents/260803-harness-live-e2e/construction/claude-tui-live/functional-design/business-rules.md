# Business Rules — claude-tui-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate Rules

- BR-G01: opt-inは既存`AMADEUS_TUI_LIVE`の`"1"`だけ。
- BR-G02: runner flagからopt-inを自動設定しない。
- BR-G03: GHA deny時はClaude/tmux probeとprocessを0回にする。
- BR-G04: supportedはClaude/tmux/version/auth/private-session capabilityの実測を要する。
- BR-G05: preflight priorityはCI→opt-in→binary→version→dist→auth→capabilityで、常にcanonical codeを1つ返す。

## Session and Settings Isolation

- BR-S01: 全tmux commandはrun専用private socketを明示する。
- BR-S02: 既存tmux server/sessionを参照・変更・killしない。
- BR-S03: Claudeはproject-only settingsを使い、user/local settings/hooksを読まない。
- BR-S04: child envはallow-list、source auth/config pathはcopy/symlinkしない。
- BR-S05: session name、socket、cwdはrun identityとscratch rootに閉じる。

## Lifecycle Rules

- BR-L01: timeoutはinterrupt/terminate、reap、session/server cleanupを完了してから返す。
- BR-L02: pane logはsanitizedし、credential/model raw outputをledgerへ入れない。
- BR-L03: debug保持でもsession/server/credentialは必ず削除する。
- BR-L04: cleanup/leak/ledger failureは元success/timeout/assertionより優先する。
- BR-L05: retry既定0、session startupの実証済みtransientだけ最大1。

## Closure Rules

- BR-C01: supportedはfake contract+minimal live green。
- BR-C02: unsupportedは実測、阻害要因、推奨seam、独立AC、Issue linkを要する。
- BR-C03: dormant test、silent skip、TBD matrixは完了ではない。
- BR-C04: Claude family seamへTUI session controlを漏らさない。
- BR-C05: CI/opt-in skipはIssue closureにせずlive run待ち。指定live環境のbinary/version/dist/auth/capability blockerはcanonical skipに加え完全なevidence package+Issueを要する。
