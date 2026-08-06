# Code Summary — `autonomy-statusline`(#2253、swarm batch 1 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

## 着地

- ブランチ: `bolt-autonomy-statusline`(builder worktree ブランチから ff 採用、最終 HEAD `93f298ff2574a4fa3cf1d6e37de6ef9545f07738`)。conductor ブランチへ --no-ff 回収マージ済み(`d14b0e761`、ls-files -u 0)。
- コミット: `668c681f5` feat(statusline): show the Intent autonomy mode segment / `93f298ff2` refactor(statusline): move the autonomy segment into a named helper(裁定 E-SRA-CG1 = B)。

## 変更ファイル

`packages/framework/core/tools/amadeus-lib.ts`(`autonomySegment` export — FR-DISP-1)/ `packages/framework/core/hooks/amadeus-statusline.ts`(named ヘルパー `withAutonomySegment` + 1 行差し替え。早期 return 3 経路無改変)/ `tests/unit/t448-autonomy-statusline-segment.test.ts`(新規)/ `tests/.coverage-registry.json`・`.coverage-ratchet.json`(再生成)。

## 検証(builder 実測 exit code + conductor 統合再実測)

builder(worktree): build 0(drift なし)/ typecheck 0 / lint 0 / t448 0(5 pass)/ complexity-gate 0(main CCN 26 維持・0 new violations)/ gen-coverage-registry --check 0 / source-only:check 0 / t168 非退行 0。TDD Red/Green 実測記録あり。
conductor(マージ後統合): typecheck 0 / lint OK / registry fresh / complexity 0 / 新規+t431 88 pass / integration(t453・t450・t121)84 pass。referee `amadeus-swarm check` converged=true / tampered=false、finalize converged。

## 申告(FD 精密化 — diary 記録済み)

裁定 B のヘルパー抽出(FD「配線 1 行」限定超過 — E-SRA-CG1)/ 不正値テスト代表値は business-rules T5 逐語の大文字形を採用 / covers ヘッダ様式の repo 既習形是正 / `AutonomyMode` 行番号の実測差(:9→:11)。
