# Code Summary — unit copytree-guard-boundary

**Depth**: Minimal / 変更 3 ファイル + 新規テスト 1 本(+21/-11 + 129 行)、プロダクトコード非変更(FR-5 充足)。

## 変更ファイル

- `tests/harness/tui-fixtures.ts`(+13/-5)— 5 面を copyTreeWithRetry へ置換(kiro 木 / kiro memory / kiro-ide 木 / kiro-ide memory / claude memory。memory 3 面は existsSync 事前条件保持の合成形)。AGENTS.md 2 面へ ENOTDIR 帰属コメント(FR-1, FR-2)
- `tests/harness/fixtures.ts`(+8/-2)— setupIntegrationProject の memory cpSync へ dest-fresh 不成立(seed 済み dest への merge 依存)の帰属コメント(FR-2)。CopyTreeOps.exists / realCopyTreeOps.exists 削除(FR-3)
- `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`(-4)— opsRecorder の exists スタブ削除(FR-3)
- `tests/integration/t-tui-fixtures-copy-guard.integration.test.ts`(新規 129 行)— mock.module による経路 assert 4 テスト(claude/kiro/kiro-ide + エラーパス伝播)。本番コードへのテスト専用分岐なし(FR-4)

## 検証実測(数値は実行出力からの転記)

| 検証 | 結果 | ref / コマンド |
|---|---|---|
| TDD Red(実装前) | 0 pass / 4 fail(kiro: Expected to contain dist/kiro/.kiro / Received: []、error path: did not throw) | 本 worktree、`bun test .../t-tui-fixtures-copy-guard...` |
| Green(実装後) | 4 pass / 0 fail / 9 expect、EXIT 0 | 同上 |
| 患部直接テスト | t-fixtures-copy-tree-retry 12/12(exists スタブ削除後も assert 変更 0) | `bun test ...` EXIT 0 |
| tui-fixtures 消費回帰 | t-kiro-tui-live-gate 12/12、t80 + t-fixtures-remove-tree-retry 12/12 | EXIT 0 |
| FR-3 機械検証 | `git grep -n "ops\.exists" -- tests/harness/fixtures.ts` → :600(RemoveTreeOps)の 1 行のみ | 本 worktree |
| typecheck / lint | exit 0 / exit 0(setupTuiProject 複雑度 41→41 不変を stash 比較で実測) | `bun run typecheck` / `bun run lint` |
| フルスイート | **RESULT: PASS**(Total assertions 13412 / Failed 0、coverage・patch coverage gate 込み、単独所有実行) | `bash tests/run-tests.sh --ci` @ 本 worktree |

## Key decisions / 逸脱

- plan からの逸脱なし。spy 機構は mock.module(既存前例 t245:603 / t-bolt-failure-transitions:22 の様式)— 本番コードへのフック追加を回避
- FR-6: enhancement Issue **#3027** 起票済み(スコープ (b) の分離 — ラベル enhancement/P3 へ是正済み)
- 除外 3 面の帰属コメントは面固有の理由(ENOTDIR 非リトライ / seed 済み dest への merge 依存)を英語で明記(FR-2 の内容照合要件充足)
