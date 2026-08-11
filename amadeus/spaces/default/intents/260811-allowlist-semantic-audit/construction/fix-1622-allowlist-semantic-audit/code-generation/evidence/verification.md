# 検証記録(Step 9)

上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

すべて最終変更後に 1 コマンドずつ直書きで実行し、exit code を個別に読んだ
(`cid:code-generation:cg-no-shell-var-command-loop`)。値は実出力からの転記であり記憶で書いていない
(`cid:requirements-analysis:numbers-from-command-output-only`)。

| コマンド | exit | 出力の要点 |
|---|---|---|
| `bun run typecheck` | 0 | `tsc --noEmit` × 2(本体・tests) |
| `bun run lint` | 0 | `Checked 1788 files` / warnings 459・infos 17(いずれも既存。変更ファイルへの新規指摘なし) |
| `bun run build` | 0 | 実行後 `git status --porcelain` に生成物由来の差分なし(追跡ファイル不変) |
| `bun run coverage:ci` | 0 | `Failed files: 0` / `Total assertions: 13225` / `Failed assertions: 0` / `RESULT: PASS` |
| `bun tests/coverage-patch-gate.ts --check` | 0 | `Patch coverage gate: PASS` / `measured added lines: 225, covered: 225, allowlisted: 0, uncovered: 0` |
| `bun tests/coverage-project-gate.ts --check` | 0 | `OK — current 93.1008%, absolute minimum 90.00%, merge-base 40.9395%, relative tolerance 0.02pp, delta 52.1613pp` |
| `bash tests/run-tests.sh --ci` | 0 | `Failed files: 0` / `Total assertions: 13225` / `Failed assertions: 0` / `RESULT: PASS` |
| `bun tests/gen-coverage-registry.ts` | 0 | 再生成後の drift なし(`git status --porcelain tests/.coverage-registry.json` が空)。`covers:` は既存の `harness-instrument:coverage-patch-gate` を使うため `EXPECTED_NONE_TO_CLI` の追記も不要 |
| 制御バイト走査(python 直走査) | 0 | 変更・追加 13 パスを走査。TAB/LF/CR 以外の C0 と DEL は 0 件 |

**patch gate は自分の追加行にも効いている**。1 回目の `--check` は
`measured added lines: 231, covered: 227, allowlisted: 0, uncovered: 4` で赤になり、
4 行(分類器の fail-closed default arm / audit sweep の source-not-found throw /
到達不能な catch 2 行)を allowlist ではなく**テスト追加と過剰防御の削除**で解消した。
最終状態の allowlisted は 0 である — 新設ガードのために新しい免除を 1 件も足していない。

## `bash tests/run-tests.sh --ci` の 1 回目の赤について(帰属の切り分け)

1 回目の実行は 4 ファイル / 18 assertion が赤だった。**18 件すべての失敗署名は
`this test timed out after 30000ms` であり、assertion 失敗は 0 件**。
`cid:build-and-test:c2-2814-conductor-is-a-load-source` の 3 点対照で帰属を確定した:

| 条件 | 結果 |
|---|---|
| (1) 並行負荷ありのフル | 4 files / 18 assertions FAIL(全件 timeout。1 テストで実測 497s・502s — 30s 制限に対し 16 倍超) |
| (2) 当該 4 ファイルの単独実行 | `Failed files: 0` / `Total assertions: 180` / `RESULT: PASS` |
| (3) 負荷なしのフル再実行 | `Failed files: 0` / `Total assertions: 13225` / `RESULT: PASS` |

加えて **同一コミットの `coverage:ci`(同じ `--ci` runner + coverage)で当該 4 ファイルは全て PASS**
(`=== DONE t222-migration-routing.test.ts (PASS) ===` ほか 3 件)。
4 ファイルはいずれも本 intent の変更対象外である(`git diff --name-only 854692fd7 HEAD --` で 0 件)。

**証拠の限界**: 上記 3 点はいずれも**変更後のツリー上の観測**である。変更前コミットを同一の負荷条件で
回す対照は取っていないため、「本変更が負荷退行を持ち込んだ」可能性を形式的には排除していない。
状況証拠として、赤くなった 4 ファイルは本変更の diff に含まれず、追加したのはテスト 2 ファイルと
gate の判定コードのみである。
