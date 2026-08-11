# Build and Test Results — 260810-control-byte-gate

上流入力(consumes 全数): code-generation-plan.md(Step 8 の検証コマンド列 — 本書が実行した対象)、code-summary.md(出荷断面の実測値 — 本書の再実測との照合元)。

## 測定 ref

- ブランチ: `record-sync-260810-cbg`、`origin/main`(`10fd33610` = PR #2880 の squash 着地)にアンカー
- 実測日: 2026-08-11
- 各コマンドの exit code は個別に取得(パイプ越しの `$?` は使用していない)

## ビルド

| コマンド | exit | 結果 |
|---|---|---|
| `bun run build` | 0 | 全ハーネスの dist とセルフインストール面を再生成。**追跡ファイルの差分ゼロ**(source-only 境界のとおり生成物は未追跡) |
| `bun run typecheck` | 0 | `tsc --noEmit` × 2 構成 |
| `bun run lint` | 0 | Biome |

## テスト

| 実行 | exit | 結果 |
|---|---|---|
| フルスイート `bash tests/run-tests.sh --ci` | 0 | **RESULT: PASS** — Test files 979 / Failed files 0 / Total assertions 13,196 / Failed assertions 0 |

### 初回赤の帰属(負荷起因・自変更由来ではない)

初回のフルスイートは `RESULT: FAIL`(7 files / 36 assertions)だった。3点対照で帰属を確定した:

| 条件 | 結果 |
|---|---|
| フルスイート + 並行負荷 | **FAIL** — 7 files / 36 assertions |
| 当該7ファイルを単独実行 | **0 fail**(5本 119 pass / 2本 49 pass + 1 skip) |
| フルスイート・並行負荷なし | 同7ファイルすべて **PASS**、全体 0 fail |

失敗した7ファイル(`t-codex-hooks-migration` / `t121-stop-hook-enforce` / `t128-custom-runner` / `t130-scope-runners` / `t131-hooks-settings-fire` / `t135-invoke-swarm` / `t227-codex-migration-walking-skeleton`)はすべて hook・CLI を `spawnSync` で入れ子起動する系で、失敗署名は `status=-1`(シグナルによる kill)+ 20〜24秒の実行時間 = タイムアウトだった。assertion の内容による失敗は1件もない。

負荷要因は conductor 自身が作った — フルスイート走行中に、ゲートの実測(16,798 ファイル走査 × 2回、159.4 MiB の読取)を並行実行していた。`cid:code-generation:fanout-load-settle-before-integration` の既知パターン(入れ子 spawn 型テストが外側の並列と重なりタイムアウト予算を食い切る)と一致する。

## ゲート自身の実測(FR-CBG-10 / FR-CBG-14)

| 項目 | 実測値 | 取得コマンド |
|---|---|---|
| verdict | exit 0、`scanned 16798 files, no control bytes found` | `bun tests/control-byte-gate.ts --check` |
| tracked 列挙件数 | 16,799 | `git ls-files \| wc -l` |
| 件数整合 | 16,799 − allowlist 1 件 = 16,798 ✓ | 上記2値の照合 |
| 実行時間 | 668 ms(30s 予算に対し二桁の余裕) | `date +%s%N` の前後差 |
| コーパス総バイト数 | 167,149,276 bytes(159.4 MiB) | `git ls-files -z` の各 path に `os.path.getsize` を合算(python) |

コーパス総量 159.4 MiB は performance-design.md の「数百 MB 未満」という規模前提を引き続き裏付ける(出荷断面の 145.6 MiB から main の前進分だけ増加)。

## 未解決の項目

なし。フルスイート・ビルド・静的検査・ゲート自身のいずれも緑で、失敗の持ち越しはない。
