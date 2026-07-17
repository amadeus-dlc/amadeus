# Runbooks — Issue #1048(repo-native、incident-response:c3)

上流入力(consumes 全数): `../observability-setup/dashboards.md`(N/A 根拠)、`../observability-setup/alarms.md`(N/A 根拠)、`../../construction/installer-enum-extension/nfr-design/reliability-design.md`(失敗様式)、`../../construction/installer-enum-extension/nfr-design/security-design.md`、`../../construction/installer-enum-extension/infrastructure-design/deployment-architecture.md`(revert 経路)。

## RB-1: 列挙拡張起因の欠陥(本 intent 固有)

1. **Detect**: 利用者報告 or CI 赤(契約テスト・install-flow・t230)→ GitHub Issue 起票(bug+P/S ラベル、再現手順・file:line 必須)
2. **Recover**: rollback-runbook.md の revert 定型(6f11f6d5c の git revert 通常 PR — 修正可能なら fix PR を優先)
3. **Verify**: 起票時再現手順の verbatim 再適用で閉包実証(fix-review-replays-origin-repro)+全検証コマンド exit 0
4. **Record**: Issue コメント+PR リンク(相関可能な repo-native record が正本 — 別基盤なし)

## RB-2: hook project-dir 誤解決(rung 2 面)

1. Detect: audit shard の書き込み先異常 or t230 赤
2. Recover: KNOWN_HARNESS_DIRS の該当 entry を検分(amadeus-lib.ts:121)— revert または fix
3. Verify: t230 再実行+worktree レイアウトでの手動 grep
4. Record: 同上(Issue+PR)
