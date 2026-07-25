# Build & Test Results — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-summary.md`

- `code-summary.md` — 実装者申告の exit code 表を引き、conductor による独立再実行の照合対象とした。
- `code-generation-plan.md` — 変更11コピーの一覧を引き、ドリフト検査の網羅対象を確定した。

測定 ref: ブランチ `fix/1449-watcher-verification-applicability-guard`、HEAD `22829d0b8`（実装 `294df1281` + 成果物 `22829d0b8`）。全数値はコマンド出力からの転記（`cid:requirements-analysis:numbers-from-command-output-only`）。

## 検証コマンドの実測 exit code

| コマンド | 実装者申告 | conductor 独立再実行 | 一致 |
| --- | --- | --- | --- |
| `bun run typecheck` | 0 | 0 | ✅ |
| `bun run lint` | 0 | 0 | ✅ |
| `bun run dist:check` | 0 | 0 | ✅ |
| `bun run promote:self:check` | 0 | 0 | ✅ |
| `bash tests/run-tests.sh --ci` | 0 | 0 | ✅ |

exit code はパイプ非経由で捕捉（`cid:code-generation:no-exit-capture-through-pipe`）。

## テストスイート集計（`bash tests/run-tests.sh --ci` 出力からの転記）

```
Test files: 546
Failed files: 0
Total assertions: 7565
Failed assertions: 0
RESULT: PASS
```

サイズ分布: smoke 14 / unit 282 / integration 250 / e2e 81 / other 2（TOTAL small 133 / medium 493 / large 3）。

## 個別テスト

| 対象 | 結果 |
| --- | --- |
| `tests/integration/t294-team-up-watcher-applicability.test.ts`（新規） | 7 pass / 0 fail、19 expect、194ms |
| `tests/integration/t-team-up-watcher-arming.test.ts`（既存） | 11 pass / 0 fail、47 expect、1.54s |

## 落ちる実証（`org.md` Mandated / NFR-1）

修正コミット後に対象ファイル限定で pre-fix 面を再現（stash 不使用、`cid:code-generation:falling-proof-no-stash`）:

```
git checkout 294df1281~1 -- packages/framework/core/tools/team-up.sh
bun test tests/integration/t294-team-up-watcher-applicability.test.ts
  → 5 pass / 2 fail (exit 1)
     ✗ default monitor-mode bootstrap prompt does not apply (FR-1)
     ✗ the skip is announced exactly once on stderr, never on stdout (FR-2)
git checkout 294df1281 -- packages/framework/core/tools/team-up.sh
  → 7 pass / 0 fail
```

注入面はテストが実際に読む正本ファイル（`cid:code-generation:injection-surface-verify`）。実装者と §12a reviewer が**独立に2回**再現し、同一結果を確認した。

## 実 launch の効果実証

| | 修正前 | 修正後 |
| --- | --- | --- |
| アタッチ到達時間 | 200.85 秒 | **5.87 秒** |
| 終了コード | 1 | **0** |

計測環境は両回とも完全撤去（`git worktree list` が前後 31件で一致）。

## 既知の非退行事項

`--ci` は wall-clock drift を1件報告した: `tests/integration/t-codex-hooks-migration.test.ts`（declared=medium / measured=large、35.02s）。本コミットが触れていないファイルで、最終変更は #1212 の `bf84cdfaf`。本変更とは無関係な既存条件であり `RESULT: PASS`。`project.md` Forbidden（既存の赤を無視しない）に従い、修正はせず本書に明示的にフラグする。

## 判定

**全検証通過**。要件 FR-1〜FR-6 / NFR-1〜NFR-4 の受け入れ基準を満たし、退行なし。
