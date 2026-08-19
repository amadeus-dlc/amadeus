# Code Generation Plan — kiro-tui-live-e2e（Bolt 1）

## 方針

Functional Design（business-logic-model.md / business-rules.md / domain-entities.md）と NFR Design（security-design.md / logical-components.md）で確定した契約を、既存 live E2E kernel（`tests/harness/live-e2e/`）の adapter 契約に沿って実装する。kernel 自体は再設計しない。precedent は `claude-tui.ts`（TUI transport）とその integration/gate テスト。

実装前に、直接接続 branch の成立可否を実 kiro-cli 2.13.0 に対する live probe で確定させる（コードを書く前に blocking question を潰す）。probe の結果に基づき direct branch を採用し、follow-up Issue branch は不要と判定した。

## 実装ステップ（TDD）

1. **共有部の抽出（refactor）**: `claude-tui.ts` から tmux 駆動と scratch git init を `tmux.ts` / `scratch.ts` へ抽出し、公開 API を変えずに再配線する。既存 claude-tui 回帰で緑を確認。
2. **Kiro 接続層（feat）**: `kiro.ts`（auth/config binding — 資格情報バイトを scratch へコピーせず、source home への symlink で束縛）と `kiro-tui.ts`（`KiroTuiAdapter`: run-private tmux socket/session、決定的 disk/state anchor、bounded pane evidence、timeout/abort 時の descendant kill、cleanup barrier）を追加。registry に `kiro-tui` 行、journey に `createKiroTuiJourney` を追加。
3. **テスト（test）**: contract/integration（gate・isolation・cleanup barrier を含む 17 件）と serial kernel テスト、opt-in live gate（`AMADEUS_KIRO_TUI_LIVE=1`）を Red → Green で追加。通常 CI では live process を起動しない。
4. **実測での修正（fix）**: 実挙動から発見した欠陥（socket path 長制限、pane 内 PATH 書き換え、cleanup の reap シグナル誤り）を修正し、cleanup 失敗を PASS に変換しない契約を固定。

## 検証計画

- 収束条件: worktree で `bun run build && bun run typecheck && bun run test:ci` 全緑、lint はベースライン以下。
- live 検証: `AMADEUS_KIRO_TUI_LIVE=1` の journey を 3 回連続実行し、scratch root / socket / kiro-cli プロセスの残存ゼロを確認。

## 制約

- kernel（`runLiveJourney` 等）は変更しない。retry 実装が kernel 変更を要する場合は maxAttempts:1 のまま deviation として記録し、承認ゲートで裁定を仰ぐ。
- `tests/no-silent-drop/*`、`metrics/*`、`.github/workflows/*` は変更しない。
- direct 接続が構造的に不成立の場合は Issue を起票せず、sanitized blocker evidence を持ち帰り人間の裁定を仰ぐ。
