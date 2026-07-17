# Code Generation Plan — fix-1015-scope-change-checkbox

- Issue: #1015(scope-change の checkbox 再構築が awaiting-approval/revising を pending へ崩落+ヘッダ4状態 drift)
- 実装: worktree 隔離 builder(bolt/fix-1015-scope-change-checkbox、base origin/main d6b489772)

## 方針

- FR-3(AC-3a): marker 三項(:3228-3230)を `CHECKBOX_MAP[existing.state]` の canonical 導出へ置換、default も `CHECKBOX_MAP.pending`(手書きマーカー文字列の排除 — parse⇔rebuild の6状態対称)
- FR-4(AC-4a/4b): ヘッダ重複2箇所(intent-birth テンプレ :2748 / scope-change 書き戻し :3238)がドリフトの根源のため、`amadeus-lib.ts` に共有定数 `STAGE_PROGRESS_HEADER_COMMENT` を新設し両所を canonical 1定義へ(提供側1・消費側2の棚卸しを diff 内で実施 — review-fix-propagation)
- テストシームとして `handleScopeChange` を export(seam-export-handler-amend 様式)、dist から in-process 駆動(t203/rollup-seam の既習イディオム)

## テスト計画

- integration tier(fs 使用のため — size-purity 準拠): `[?]`/`[R]` を載せた state fixture への scope-change 後の6状態保存(t-scope-change-checkbox-preserve)
- 落ちる実証: export のみ適用した旧ロジック dist に対し先行実行 → `[?]`/`[R]` 崩落と4状態ヘッダで RED を記録

## 品質ゲート

typecheck / lint / dist:check / promote:self:check / coverage-registry --check / 関連テスト(t27/t36/t194 含む)、push 前 lcov DA:0 ゼロ、deslop、fix-diff-independent-reverify。
