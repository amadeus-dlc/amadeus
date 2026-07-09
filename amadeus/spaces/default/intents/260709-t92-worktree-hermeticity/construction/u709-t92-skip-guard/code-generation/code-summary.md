# code-summary — u709-t92-skip-guard (#709)

## 対象

- Intent: `260709-t92-worktree-hermeticity`(bugfix / GitHub #709 / P2)
- Unit: `u709-t92-skip-guard`
- 修正方式: skip-with-reason ガード(選挙 Q1=A、FR-709)
- ブランチ: `fix/709-t92-worktree-skip-guard`(ベース: `origin/main` = `6ac15f7c4`)
- コミット: `f84a8339d`(ガード本体)

## 変更内容(file:line)

- `tests/integration/t92.test.ts`
  - `:1157-1165` — Group N のフィクスチャ解説コメントに #709 の説明段落を追記(未 install worktree ではピンが測定不能である旨、英語)。
  - `:1168` — 追加: `const PINNED_TSC = join(REPO_ROOT, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");`
  - `:1169-1171` — 追加: `const TEST44_SKIP_REASON`。`existsSync(PINNED_TSC)`(シンボリックリンク追従。本番センサー `amadeus-sensor-type-check.ts:192` の判定と同一)が真なら `null`、偽なら理由文字列 `"repo-pinned tsc not installed (bun install not run) — pinned exit-2 classification is unmeasurable; see #709"`。
  - `:1174-1176` — test 44 の宣言を `test(...)` から `test.skipIf(TEST44_SKIP_REASON !== null)(...)` へ変更。テスト名テンプレートに skip 時の ` — SKIP: <reason>` を付与(コードベース既存の `t-tui-*.serial` / `kiro-acp-drive.calibration` の `SKIP_REASON` + `skipIf` 先例に準拠)。
  - `:1200-1204` — アサーション本体はバイト完全一致で不変(install 済み環境ではピンは従来どおり厳密に評価される)。

- 修正境界: test 44 単独。本番センサー・他テストは不変(スコープ外)。差分統計: `1 file changed, 17 insertions(+), 1 deletion(-)`。

## Red / Green エビデンス(exit code + 主要行)

### Red(修正前・未 install の detached worktree)

- 環境: `git worktree add --detach <tmp> 6ac15f7c4` を `bun install` せずに作成。bunx 解決可能なグローバル TS(6.0.3)・biome あり(クロスレビュー再現手順と同条件)。
- 実行: `bun test tests/integration/t92.test.ts`
- 結果: **EXIT=1**、`44 pass / 1 fail`。**失敗は test 44 のみ**。
- 失敗行: `tests/integration/t92.test.ts:1188:52`
  - `Expected: "script-error: exit-2"`
  - `Received: "script-error: exit-1"`
  - → 未 install により `resolveTscLauncher` が `bunx tsc`(TS 6.0.3)へフォールバックし、pinned tsc の exit-2 が exit-1 へドリフト。#709 の偽赤を実測再現。
- 実行後、当該 throwaway worktree は `git worktree remove --force` で撤去。

補足: サンドボックス既定環境(bunx が tempdir 書込不可)では同 worktree で test 11/12/15/16/44/45 の 6 件が `tool-unavailable` で赤くなる。これは bunx ツール自体が解決できないサンドボックス固有の劣化であり #709 スコープ外(11/12/15/16/45 は exit code 非依存で本来堅牢)。忠実な #709 環境(bunx 解決可)では上記のとおり **test 44 のみ**が赤。

### Green(a)(修正後・未 install の detached worktree)

- 環境: `origin/main` の detached worktree に修正済み `t92.test.ts` をコピー、`bun install` なし。bunx 解決可。
- 実行: `bun test tests/integration/t92.test.ts`
- 結果: **EXIT=0**、`44 pass / 1 skip / 0 fail`。
- test 44 単体フィルタ実行(`-t "44: tsc non-zero"`): `0 pass / 1 skip / 0 fail` → test 44 が理由付きで skip されることを確認。
- 撤去済み。

### Green(b)(修正後・install 済みの本 worktree)

- 環境: 本 worktree で `bun install --frozen-lockfile`(`typescript@6.0.3` 等 255 packages)実行。`node_modules/.bin/tsc -> ../typescript/bin/tsc` 実在。
- 実行: `bun test tests/integration/t92.test.ts` → **EXIT=0**、`45 pass / 0 fail`、**skip 0 件**。
- test 44 が **実行(skip されない)** ことの明示確認: `-t "44: tsc non-zero"` → `1 pass / 0 fail / 3 expect() calls`(アサーション 3 本が実評価)。

## ゲート結果(install 済み本 worktree、exit code)

| ゲート | exit code |
| --- | --- |
| `bun run typecheck` | 0 |
| `bun run lint` | 0(warnings/infos のみ、失敗なし) |
| `bash tests/run-tests.sh --ci` | 0(Test files: 270 / Failed files: 0 / assertions 3947 / Failed 0 / RESULT: PASS) |
| `bun run dist:check` | 0(all harness trees in sync) |
| `bun run promote:self:check` | 0(project-local self install in sync) |

## FR トレース

- FR-709-1: 未 install worktree で t92 が exit 0、test 44 起因の偽赤が消滅(Green(a))。
- FR-709-2: install 済みで test 44 は実行され exit-2 を厳密検証、install 済みで誤 skip されない(Green(b)、skip 0 件)。skip は理由文字列付きで可視化。
- FR-709-3: red(修正前・未 install で赤)/ green(修正後・未 install で skip、install 済みで実行緑)を実測記録。
- FR-709-4: typecheck / lint / `run-tests.sh --ci` すべてグリーン。

## 備考

- 本番センサー(`amadeus-sensor-type-check.ts`)・`dist/`・セルフインストールツリーは未変更(テストファイル 1 件のみ)。dist:check / promote:self:check は無変更で緑。
- テスト専用分岐を本番コードに追加していない(修正は t92 テストファイル内に閉じる)。

## 是正(PR #721 レビュー、codex-2 NOT-READY)

- **指摘**(https://github.com/amadeus-dlc/amadeus/pull/721#issuecomment-4926582537): ガードの候補集合が `node_modules/.bin/tsc`(Win は `tsc.cmd`)のみを見ており、本番 `resolveTscLauncher`(`amadeus-sensor-type-check.ts:182-201`)が Windows で `tsc.cmd → tsc.exe → tsc` の候補集合を走査するのと不一致。`tsc.exe` または拡張子なし `tsc` のみが存在する環境では、センサーはローカル pinned tsc を使うのに test 44 が誤って skip される検出力ホール。
- **修正**(`tests/integration/t92.test.ts:1168-1176`): 候補集合を `resolveTscLauncher` と完全一致させた。`const PINNED_TSC_CANDIDATES = process.platform === "win32" ? ["tsc.cmd", "tsc.exe", "tsc"] : ["tsc"];` とし、`PINNED_TSC_CANDIDATES.some((name) => existsSync(join(REPO_ROOT, "node_modules", ".bin", name)))` が真(いずれか 1 つでも存在)なら test 44 を実行、偽なら理由付き skip。センサーと lockstep で維持すべき旨を英語コメントでファイル/行参照付きで明記。
- **未 install 挙動は不変**: 候補を広げても、未 install worktree では 3 候補すべてが不在(dangling symlink → `existsSync` false)であり、従来どおり全滅 → skip 継続。widening は「pinned tsc が実在する環境で誤 skip しない」方向にのみ作用し、skip 判定の緩和は起きない。よって未 install worktree の再現は不要と判断(Green(a) は不変)。
- **実測**(install 済み本 worktree):
  - `bun test tests/integration/t92.test.ts` → **EXIT=0**、`45 pass / 0 skip / 0 fail`(test 44 実行)。
  - `bun run typecheck` → **EXIT=0**。
  - `bun run lint` → **EXIT=0**(warnings/infos のみ)。
- コミット: `test(t92): match skip-guard tsc candidates to sensor launcher set (#709 review fix)`。
