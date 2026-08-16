# Code Summary — pi-distribution(#2363)

branch `open-bug-batch-7/pi-distribution`(実装 head `64ce0a7b9` + 追補 `7ee84f501`、record 同梱後の PR head は pr-convergence-report.md の記載を正とする。push 済み・conductor 統合済み)。方式 = D2(kimi 先例踏襲 + 2 方向検証)+ 裁定 E-AD-22BD77EC(scope-parity sensor と面列挙の 6 面拡張を同 unit で実施)。実測値は builder 報告からの転記、conductor 統合断面の再実測は末尾。

## 変更ファイル(計 32、うち新規 1)

- コア 3 面: `scripts/plugin-projection.ts`(`SELF_INSTALL_HARNESSES` + pi)、`scripts/promote-self.ts`(`managedDirs` + `{ src: "dist/pi/.pi", dst: ".pi" }`)、`packages/framework/core/tools/data/self-install-allowlist.ts`(`GENERATED_SELF_INSTALL_ROOTS` + `.pi`)
- 列挙面同期: `.gitignore`(`/.pi/**`)、`AGENTS.md`、`docs/reference/11-contributing.md` + `.ja.md`、`.github/workflows/ci.yml`(GENERATED_OUTPUTS)、`scripts/detect-ci-changes.sh`、`.coderabbit.yaml`
- 追補(E-AD-22BD77EC): `amadeus-sensor-self-scope-consistency.ts`(`SELF_HARNESSES` 6 面化)+ sensor manifest 散文同期、テスト列挙 5 箇所(t413 FACES / t369 SELF_INSTALL_DIRS / t-scope-promotion-canonical DOGFOOD_FACES / t307 dirs / t415 HOSTS)
- テスト: 新規 `tests/integration/t2363-pi-self-install-delivery.integration.test.ts`(件数フリーの dist⇔配送先集合一致 + 空振り防止ガード)、t209 に vendor 配送 + project-root .gitignore 不変の 2 述語

## TDD

- Red 1(本体): 固定件数ピン更新 + 新述語で 9 fail(exit 1)→ 3 面追加後 Green(66 pass、回帰 23 ファイル 179 pass)
- Red 2(追補): sensor 新設ピン 1 fail → `SELF_HARNESSES` 6 面化で Green(37 pass)。他 4 列挙は追加時点 green(既にパリティ充足のため — 申告済み)

## 逸脱・判断(いずれも申告 + 裁定済み)

1. vendor 述語の置換: 「既追跡ファイルの非脱落」は `.pi` 全面生成物のため常真の空振り(`git ls-files '.pi*'` → 0 件)— 実効のある「vendor サブツリーが promote で配送される」述語へ置換(P2 の検証劇場回避)
2. t415 は HOSTS が 6 ホスト集合(≠ self-install 5 面)のため、pi を `HOST_ONLY_DIST`(face なし host)として cross-contamination 不変量にのみ載せた — pi は hook/adapter 配線を持たず、FACES 行にすると実在しない startup 配線を主張することになるため(裁定 E-AD-5DD8BB00 で追認)

## 検証(worktree、exit code は builder 実測)

typecheck 0 / lint 0 / source-only 0 / coverage-registry --check 0(regen 差分 0)/ promote-self --check 0 / build 前後の追跡不変 0 / 対象 23 ファイル 180 pass 0 fail / t415 8 pass。conductor 統合断面の再実測: build exit 0・追跡汚染 0 件・`.pi/agents` ⇔ `dist/pi/.pi/agents` 集合一致(15 件)・reviewer charter `tools: read, grep, find, ls` 逐語・source-only 0。フルスイートはリモート CI 正。

## 申し送り

- `DIST_FACES`(t369 / t-scope-promotion-canonical の dist 投影軸 7 件)には従前から pi 不在 — 本 unit の裁定射程(5 リスト)外の既存ギャップとして未変更(follow-up 候補、E-AD-5DD8BB00 で据え置き確認)
- gitignore 衝突なし: pi の dot-gitignore は `dist/pi/.gitignore` へ降りるだけで project-root `.gitignore` とは独立(t209 の機械述語で固定)
