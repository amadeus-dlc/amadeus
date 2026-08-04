# Code Summary — claude-tui-live

## 実装結果

- `claude-tui` capability、strict opt-in、GitHub Actions hard deny、Claude/tmux/version/dist/auth preflight を追加した。
- fresh Claude project/home と project-only settings を再利用し、128-bit run ID ごとの private tmux socket/session を追加した。tmux server/session 操作はすべて明示 `-S` を通る。
- readiness 後に current-run ID を含む anchor prompt を1回送信し、bounded pane capture と exact file anchor を照合する journey を追加した。
- lifecycle を authoritative terminal contract へ修復した。cleanup failure、leak、retained resource は `LiveRunError.cleanup-barrier-failed` を返し、C8 ledger append を実行しない。元 outcome は `originalOutcome` の secondary context に限定した。
- fake tmux/Claude の統合テストで private socket、source env 非流出、current-run anchor、session→server cleanup、cleanup failure 時の ledger 0 回を固定した。

## 検証結果

- live E2E focused regression: 59件成功、1件SKIP、失敗0件。SKIPは`AMADEUS_TUI_LIVE`未設定による実live journeyのstrict gate。
- `bun run typecheck`: 成功。
- `bun run lint`: exit 0。既存 baseline の cognitive-complexity 等の warning のみ。
- changed-file Biome check: 11ファイル成功、診断0件。

## 非実施

実 Claude credential/model/network を使う live run はこの code-generation では実行していない。実装の terminal closure は offline fake contract で検証し、実 live green receipt は明示 opt-in 環境でのみ生成する。
