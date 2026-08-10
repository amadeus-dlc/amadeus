# build-and-test memory (260810-plugin-manifest-resoluti)

## Interpretations

- 2026-08-10T12:05:00Z — Comprehensive test strategy だが performance/security NFR 非存在のため該当 instructions は「対象外 + 理由」の1頁とした。directive produces 7 件は全て作成
- 2026-08-10T12:05:00Z — FR-8 の「consumer 実測」は /tmp scratch の consumer 形ワークスペース 2 腕(folder-drop / install verb)で実施。chore scope の throwaway intent を birth し build-and-test checkpoint まで駆動(artifact/presence guard は framework の文書化 off-switch を scratch 内でのみ使用)

## Deviations

- 2026-08-10T12:05:00Z — `test:ci` 全体回帰は FAIL のままゲートへ出す。失敗 3 群は HEAD worktree で同一シグネチャを再現する既存の環境起因(team-up プロセス/herdr 依存 + size-drift 壁時計)で、変更面との無交差を import grep + HEAD 対照で実測済み。修正は本 intent の範囲外

## Tradeoffs

- 2026-08-10T12:05:00Z — failing-first は `git stash` ではなく HEAD `git worktree`(/tmp)へのテストファイル複製で取得。stash は作業木を危険に晒すが、worktree は非破壊(reviewer FOLLOW-UP への対応)

## Open questions

- 2026-08-10T12:05:00Z — FR-8 副次発見: 宣言 advisory を載せた directive が `ADVISORY_CODES` validator に拒否される(main で既存)。wire 型一般化に validator が未追随。フォローアップ起票候補としてユーザーへ提案する(本 intent では起票しない)
- 2026-08-10T12:05:00Z — `install <path>` の basename 粒度(INSTALL.md が正確なパスを明記しない)も同じく起票候補
