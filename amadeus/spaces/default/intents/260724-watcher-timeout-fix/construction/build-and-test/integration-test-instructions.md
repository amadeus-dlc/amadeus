# Integration Test Instructions — N/A判定

参照元: `code-generation-plan.md`、`code-summary.md`。

## 判定

Minimal戦略では新規のintegration test種別を生成しない。ただし変更対象がシェル関数・tmux・
実ファイル境界であるため、既存の
`tests/integration/t-team-up-watcher-arming.test.ts` を要件駆動の最小検証集合として実行する。
実行方法と合格条件は `unit-test-instructions.md` を正本とする。

## 追加対象外

実90秒待機、実チーム起動、外部agmsgプロセスを使う重い統合試験は、承認済みNFR-1と
E-WTFRA2の裁定により追加しない。短縮可能な既存タイミングシームで同じ制御経路を検証する。
