# Code Summary — `launch-autonomy-flag`(#2253、swarm batch 1 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

## 着地

- ブランチ: `bolt-launch-autonomy-flag`(ff 採用、最終 HEAD `bbce197c3e5e79d2b0a035efb3854ffd44655d5a`)。conductor ブランチへ --no-ff 回収マージ済み(`a5e82d551`、ls-files -u 0)。
- コミット: `8bc3ab6ce` feat(engine): accept --autonomy at launch and apply it through the existing write path / `2a0877506` test(engine): cover the --autonomy branch wiring against a seeded workspace / `bbce197c3` refactor(engine): lift --autonomy out of argv before the flag ladder(裁定 A)。

## 変更ファイル

`packages/framework/core/tools/amadeus-orchestrate.ts`(C12 pre-pass `takeAutonomyFlag` + C13 `readLaunchAutonomyContext` / `applyLaunchAutonomyDeclaration` + Branch 4ab)/ `tests/unit/t449-autonomy-flag-parse.test.ts`・`tests/unit/t450-autonomy-flag-apply.test.ts`(新規 unit)/ `tests/integration/t450-autonomy-flag-branch.test.ts`(新規 integration — `handleNext` in-process 駆動で判定 8 の `PROVENANCE_REQUIRED` relay まで実測)。

## 検証(builder 実測 + conductor 統合再実測)

builder: build 0(drift なし)/ typecheck 0 / lint 0 / t449+t450+integration 0(32 pass)/ complexity-gate 0(parseNextFlags CCN 29 維持)/ registry --check 0 / source-only 0 / run-tests --unit PASS(367 files/0 fail)/ --integration PASS(462 files/0 fail)/ parse 系無改変 green(t135 ほか 106 pass)/ allowlist 581/581 解決・straddle なし / no-silent-drop census pass。落ちる実証 4 点の注入→赤→復元→残渣ゼロ記録あり。
conductor(マージ後統合): typecheck 0 / lint OK / registry fresh / complexity 0 / unit 88 pass / integration 84 pass。referee check converged / finalize converged。

## 申告(FD 精密化 — diary 記録済み)

裁定 A(pre-pass 構造変更 — E-SRA-CG1 の機械的執行、last-wins 意味論は t449 で機械固定)/ `readonly` 不採用(既存 `ParsedFlags` 様式への準拠 — FD 逐語コード自身が代入形)/ 型名衝突回避の別名 import / ports 注入シーム(team.md construction のテストシーム規範準拠)。

## 未決の申し送り(実装保留 — 不正入力限定の意味差)

pre-pass は `--autonomy` が**他の valued flag の値スロット**に置かれた不正入力(例: `--scope --autonomy semi`)で FD 逐語 ladder と挙動が分岐する(ladder = `Unknown scope` loud / pre-pass = `--scope` 無音落ち)。正常入力は完全一致。封鎖には valued-flag 集合の二重定義が必要なため builder は実装せず、endorse する assert も置いていない — **build-and-test ステージまでに裁定**(候補: 現挙動を許容し docs 注記 / valued-flag 集合を canonical 1 定義へ抽出して pre-pass が参照)。あわせて reviewer FOLLOW-UP の FR-GRT-006 引用実在確認も未閉包(実装は FR-CLI-4 へ trace 済みで実害なし)。
