# Build & Test Results — 260814-t245-origin-fixture

上流入力: `code-generation-plan.md` / `code-summary.md`。測定 ref: 本 worktree head `e1157716b`(reorder 後。tree は旧 head e926f9140+3f6c03eac と同一内容)。

## Build

| 項目 | 結果 |
|---|---|
| bun install | 成功(261 packages) |
| bun run build | 成功(全ハーネス dist 再生成、追跡ファイル不変) |

## Tests(実測転記)

| 実行 | 結果 | ref |
|---|---|---|
| 対象ファイル単独(修正後・本ツリー) | 24 pass / 0 fail / 112 expect(7.05s) | head e1157716b、`bun test tests/integration/t245-...` |
| 対象ファイル単独(修正後・origin なしクローン)FR-3 | 24 pass / 0 fail(6.90s) | noorigin-clone(remote 0)、同コマンド |
| TDD Red(修正前・origin なしクローン) | 23 pass / 1 fail(gitStdout t245:80 ← :213) | noorigin-clone @ 5f6b5bf97 |
| typecheck / lint | ともに exit 0 | `bun run typecheck` / `bun run lint` |
| フルスイート(リモート CI = 必須ゲート) | 全 green(Tests / Coverage / CI Success)@ 旧 head e926f9140、run 31760527210。reorder 後 head e1157716b の re-run は pr-convergence で収束確認 | `gh pr checks 3001` |
| フルスイート(ローカル 2 run) | 各 1 件の環境起因失敗(t528 = セッション状態汚染 / t99 = transient copy race)。帰属実測・単独再実行緑は code-summary.md 参照。t245 起因の失敗ゼロ | `bash tests/run-tests.sh --ci` |

## Coverage

- Patch coverage / Project coverage gate はリモート CI の Coverage Report で green(run 31760527210)。テストのみの変更でプロダクト行の被覆に影響なし

## 失敗と対処

- ローカルフルスイートの 2 flake は本変更非起因(帰属実測済み)。t528 の cwd 状態依存・t99 の copy race は §14 起票候補として conductor が保持
