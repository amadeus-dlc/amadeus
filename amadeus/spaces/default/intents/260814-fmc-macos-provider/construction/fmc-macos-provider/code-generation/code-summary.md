# Code Summary — unit fmc-macos-provider(intent 260814-fmc-macos-provider)

Issue #2361 の修正。Bolt branch `fix/2361-fmc-provider-fallback`(base origin/main `5f6b5bf97`)で TDD 実装し、conductor ツリーへ ff 取込後に origin/main(t528 隔離修正 #3000 を含む `697d49201`)を merge して統合検証済み。

## 変更ファイル

- `plugins/formal-model-check/tools/tlc-toolchain.ts` — `FIXED_JDK_RUN_PROFILE.version` を `"26"` へ、`JdkMajor26Version` 型(`"26" | \`26.${string}\``)+ `isJdkMajor26Version` 述語、`java -version` 受理規則を公開述語 `acceptsFixedJdkVersionOutput` に一本化(FR-5 A/B/C)
- `plugins/formal-model-check/tools/tlc-spawn-planner.ts` — `AutoTlcSpawnPlanner` 新設(auto+darwin: sandbox-exec 先行、snapshot 失敗時 docker 再試行、成功側が以後の argv/receipt を所有。両方失敗は `ENVIRONMENT_UNAVAILABLE` + 両理由連結)。`selectTlcSpawnPlanner` の分岐置換、`createNotRunPlannerReceipt` に `plannerIdentity` 任意引数(実選択済み planner が receipt plan を決める)。`DARWIN_INSPECTION_PLAN` expected を `"OpenJDK 26"` へ、正規表現を共有述語へ(FR-1/2/4/5 D/F)
- `plugins/formal-model-check/tools/fs-tlc-toolchain.ts` — `#verifyJavaVersion` の重複正規表現を共有述語へ(FR-5 E)
- `plugins/formal-model-check/tools/run-model-check-execution.ts` — 解決済み planner を receipt 生成(通常経路 + catch-all)へ配線(FR-4)
- `plugins/formal-model-check/README.md` / `mise.toml` — patch 完全一致宣言を major 26 契約へ統一、mise ピンは供給手段として維持、Provider fallback 節を追加(FR-6。`grep -rniE "exact patch|patch version"` 両ファイル 0 hit)
- テスト: 新設 6(unit 5 / integration 1)+ 既存強化(auto 選択を planner 種別まで assert、エラー文言3箇所更新)。`tests/.coverage-patch-allowlist.json` は既存 tlc-spawn-planner エントリの fingerprint/anchor/target を再計算(58→55 行、新規免除なし)(FR-7)

## 主要判断

- 挿入点 (b') 合成 planner(plan §設計決定、AUTO_DECIDED auto-decision-0230a868e7cb52b2315e78a40c423701)
- 逸脱申告2点(builder 報告 §5): (1) D/E の重複正規表現を共有述語へ統合(意味論保存) (2) catch-all 経路にも実選択 planner を配線(FR-4 の同種乖離の閉包)。いずれも surgical で要件範囲内と conductor が判定
- `jdkVersion: "OpenJDK 26.0.1"`(run-model-check.ts:87 / run-skeleton-ci.ts:133)は artifact キャッシュ受領書のパーティションラベルで FR-5 の6面外 — 未変更(片側変更は CacheIntegrityError を招く。変更するなら owned set 外の run-skeleton-ci.ts を含む別裁定)

## テスト / 検証(実測)

- TDD Red/Green: 7 slice で Red 実測 → Green(builder 報告 §2)。Red が取れなかった 3 面(FR-2/FR-3/FR-7 の一部)は注入 → 赤実測 → 復元(残渣 0 を grep 確認)の落ちる実証で代替
- Bolt worktree: typecheck 0 / lint 0 / source-only 0 / distribution 0 / test:ci PASS(992 files, 13369 assertions, 0 fail)
- 統合後 conductor ツリー(merge `4a0379e9a` 後): `bun run build` 0(追跡ファイル不変)/ typecheck 0 / lint 0 / `bash tests/run-tests.sh --ci` **RESULT: PASS(992 files / Failed 0 / 13370 assertions / Failed 0)**(log: セッション scratchpad fullsuite-3.log)
- merge 前のフルスイートで観測した既存赤2件は帰属切り分け済み: t528 は ambient isolation 欠陥(Issue #2981、修正 #3000 が origin/main に着地済み — merge 取込で解消を実測)、t99 は dist コピーの transient(単独再実行で緑)
- deslop: 全 diff 実読、除去対象なし(検証コマンドは deslop 後の統合検証が最終実測)

## 申し送り

- コミット: `f14b37cfc`(FR-5)/ `d5ecd637b`(FR-1〜4)/ `32598beac`(FR-6)+ record checkpoint `3aa47b35a` + merge `4a0379e9a`
- pr-convergence-report.md は pr-convergence ステージが生成する(本ステージでは未生成)
