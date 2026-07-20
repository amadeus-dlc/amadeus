# Code Summary — fix-1279-diary-autogen-guard

上流入力(consumes 全数): requirements.md(per-unit 設計6点は bugfix degrade の consumes_absent どおり不在 — design 委譲分は code-generation-plan.md が確定)

> 測定 ref: bolt コミット `9d99ce9ee`(`bolt/fix-1279-diary-autogen-guard`、base `d85dc3d65`)。PR: [#1288](https://github.com/amadeus-dlc/amadeus/pull/1288)(Fixes #1279)。

## 実装(builder subagent、worktree 隔離)

- `amadeus-lib.ts`: 純関数 `memoryPathNamesIntentRecord`(intents/ 直後セグメントの phase 名判定で fallback を識別)+wrapper `ensureStageDiaryForDirective`(record パス → 書込 / fallback×record 実在 → stderr advisory+`skipped-unresolved` / fallback×record 0件 → 無音 `skipped-prebirth`)
- `amadeus-orchestrate.ts`: chokepoint を `if (codekbCtx) ensureStageDiaryForDirective(projectDir, directive.memory_path, space)` へ — guard と書込を単一値から導出、cursor 二重解決を排除(E-DAGRA1=A+E-DAGRAX)
- テスト: `tests/integration/t-diary-autogen-guard.test.ts` 新設(再現 fixture・不変条件・advisory の stderr 限定検査)+coverage registry regen(integration-registry-regen 定型)
- 配布同期: lib/orchestrate 各11コピー、計25ファイル

## 検証エビデンス

| 検証 | 実測 |
|---|---|
| typecheck/lint/dist:check/promote:self:check/coverage:ci/patch gate | 全 exit 0 |
| --ci | exit 0(389 files / 5521 assertions / 0 fail — 初回 registry drift → regen 定型で解消) |
| 落ちる実証(2面) | 構造面: base 復帰→新テスト赤→fix SHA 復元→緑 / 挙動面: advisory `if(false&&…)` 無音化注入→該当 assertion のみ赤(comparative 的に他 5 pass 維持)→復元 clean |
| 閉包 | バグ前提再現(record 2件+cursor 不在、relativeRecordDir null 実測)で不変条件「生成 or loud advisory」HELD(exit 0) |
| lcov | patch 20/20 covered(advisory 行 canonical:1181 DA hits 121) |
| conductor 裏取り | scratch worktree 10 pass / 0 fail、three-dot 25 files +934/-70 |

## 逸脱・インシデント(申告)

- **c2 違反実例(自己検知・是正済み)**: builder が最初の編集を割当 worktree でなく**親 main checkout の絶対パス**へ誤適用 → 検知後 `git restore`+stray test 削除で完全復元 → worktree 内で再実装。conductor が親 checkout の status clean(0行)・branch main を独立実測で確認。仕様逸脱ではなく操作ミスの是正 — PM 回付(c2 のプロンプト焼き込みはあったが、絶対パス使用の癖が残った実例)。

## 関連

裁定: E-DAGRA1〜3+E-DAGRAX。留保履行: E-DAGRA2 e4 留保(到達可能性トレース → 分岐は書く判定)は plan §2 で確定済み、実装の advisory 到達を閉包で実証。レビュー: PR #1288 を e2 へ依頼。
