# Code Generation Plan — claude-tui-live

## 変更種別

`self-feature`。Issue #1717 の既決 live E2E 契約へ Claude Code TUI transport を追加する。

## 実装計画

- [x] Step 1: `claude-tui` capability と strict `AMADEUS_TUI_LIVE=1` / GitHub Actions hard deny を登録する。
- [x] Step 2: fresh project/home、project-only settings、allow-list env、credential binding を Claude family seam から再利用する。
- [x] Step 3: 128-bit run identity から private tmux socket/session を生成し、全 server 操作を `tmux -S` に閉じる adapter を実装する。
- [x] Step 4: readiness、literal prompt、current-run file anchor、bounded pane digest を持つ TUI journey を実装する。
- [x] Step 5: session→server→credential→scratch の cleanup barrier を閉じ、cleanup/leak/retained resource failure 時は `cleanup-barrier-failed` で C8 を呼ばない。
- [x] Step 6: fake Claude/tmux による private socket、env/settings、anchor、cleanup、ledger ordering の adversarial test を追加する。
- [x] Step 7: focused test、typecheck、lint を実行する。

## 完了条件

成功経路は `executed/asserted → cleanup-barrier-closed → ledger-appended|already-present → closure-committed` の順序だけを許可する。cleanup barrier 不成立時は元の command/assertion outcome を secondary context として保持するが、ledger、PASS、matrix projection を解放しない。ledger は既存の receipt ID 再検証により at-most-once を維持する。
