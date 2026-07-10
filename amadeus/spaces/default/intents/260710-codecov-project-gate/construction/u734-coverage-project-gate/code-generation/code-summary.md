# Code Summary — u734-coverage-project-gate

> 実装: cg-builder(amadeus-developer-agent、bolt worktree `bolt-coverage-project-gate`)。検分・検証裏取り: conductor。
> ブランチ: `bolt-coverage-project-gate`(origin/main 6f1d7ab2a 起点)、4コミット、working tree クリーン。

## 変更ファイル(8ファイル、+605/−15)

| ファイル | 種別 | 内容 |
|---|---|---|
| `tests/run-tests.ts` | 変更 | `collectCoverageTotals(lcov)` 抽出(単一パース)、`writeCoverageHtml` は抽出結果を消費(HTML バイト等価)、`writeCoverageTotalsJson` が `coverage/coverage-totals.json` を emit |
| `tests/coverage-project-gate.ts` | 新規 | `evaluateGate` export 純関数(判別ユニオン)、BigInt 厳密判定、parse-don't-validate、`--check`/`--update`、env 注入シーム(`AMADEUS_COVERAGE_TOTALS`/`AMADEUS_COVERAGE_PROJECT_BASELINE`) |
| `tests/.coverage-project-baseline.json` | 新規 | 実測ベースライン `{schemaVersion:1, hits:7096, lines:17519}`(40.5046%、`coverage:ci` 実行→`--update` 転写。手書きなし) |
| `tests/unit/coverage-project-gate.test.ts` | 新規 | 20テスト: 境界両側(ちょうど−0.02pp=緑/1ヒット超過=赤)、MALFORMED 4種+不正JSON、EMPTY_POPULATION 両側、MISSING 両種、プロセス境界の落ちる実証4ケース+usage、`--update` 拒否/転写 |
| `.github/workflows/ci.yml` | 変更 | coverage ジョブ「Generate coverage reports」直後・upload 前に `Project coverage gate` ステップ(+3行のみ) |
| `codecov.yml` | 変更 | `coverage.status.project` ブロックのみ削除(−6行)。patch/ignore/fixes バイト等価 |
| `docs/reference/09-testing.md` | 変更 | 新節「Project Coverage Gate」(EN、FR-7 の5点網羅) |
| `docs/reference/09-testing.ja.md` | 変更 | 同節の日本語版 |

## 主要な実装判断

- 判定と表示の分離: pass/fail は BigInt 整数式のみで確定し、%・delta は表示専用導出(NFR-2)。
- `LoadedTotals`(present/text)を evaluateGate の入力にし、ファイル読みと判定を分離 — 判定の単一情報源を関数内に保ち、テストが I/O なしで全分岐に到達できる。
- registry 再生成は no-op(新規ファイルは enumerated unit を追加しないため)。`--check` green を実測確認。

## 検証(conductor 再実行の実測 exit code)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bun test tests/unit/coverage-project-gate.test.ts` | 0(20 pass / 0 fail) |
| `bun tests/coverage-project-gate.ts --check` | 0(current=baseline、delta 0.0000pp) |
| `bash tests/run-tests.sh --ci` | 0(**RESULT: PASS、Failed assertions: 0**) |

補記: フルスイート初回実行で 4046 中 1 assertion FAIL を観測したが、builder と conductor のスイートが同一 worktree で並走していたことが原因の flake(builder 単独実行=PASS、conductor 単独再実行=PASS の両実測で確認)。

## プランからの逸脱

1. **worktree ベース是正**: `amadeus-worktree create --base main` が stale なローカル main(611dd1ef8)から fork していたため、builder が worktree 内で `git reset --hard 6f1d7ab2a`(origin/main)へ是正してから実装(org.md「Bolt ベースは main」の意図に整合)。ツール側の silent fork は **#760** として起票済み(bug/P2、e1+e5 レビュー割当済み)。
2. その他の逸脱なし(全8ステップ完了、チェックボックス消込済み)。

## 落ちる実証(NFR-1)の所在

- プロセス境界: `tests/unit/coverage-project-gate.test.ts` の「process boundary: --check」describe — 低下注入/emit 欠落/baseline 欠落で exit 1、閾値内で exit 0 を `spawnSync` 実測。
- builder 追加の手動実証: baseline 7096/17519 に対し current 7000/17519 注入 → DROP_EXCEEDED exit 1(値はファイル由来)。
