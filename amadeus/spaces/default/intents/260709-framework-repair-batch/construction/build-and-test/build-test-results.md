# Build and Test Results — framework-repair-batch

> 実行環境: claude-engineer-2 worktree、ブランチ claude-engineer-2(origin/main の4修理マージ後コミットを取り込み済み)。実行日: 2026-07-09。すべて実測 exit code(build-instructions.md / unit-test-instructions.md のコマンドをそのまま実行)。

## ビルド相当の検証結果

| コマンド | exit code | 判定 |
|---|---|---|
| `bun install` | 0(255 packages) | ✅ |
| `bun run typecheck` | 0 | ✅(初回は 127 — main 取り込み後の `bun install` 未実行が原因。再導入後 0) |
| `bun run lint` | 0 | ✅(警告は既存・本 intent の変更ファイルに指摘ゼロ) |
| `bun run dist:check` | 0 | ✅ |
| `bun run promote:self:check` | 0 | ✅ |

## テスト実行結果

```
bash tests/run-tests.sh --ci
Test files: (全層) / Failed files: 0
Total assertions: 3902 / Failed assertions: 0
RESULT: PASS(exit 0)
```

- 本 intent の回帰テスト(setup-installation / setup-upgrade / t202 センサーランチャー / t202 worktree マーカー / t07 / t92)をすべて含んで全緑
- **t92 のローカル赤(intent 着手時のベースライン失敗)は fix-657 マージにより解消** — 修理前は同環境で決定的に赤だったものが、同一環境で緑に転じたことを確認(修理の実効性の直接証拠)

## 失敗詳細

なし(Failed files: 0 / Failed assertions: 0)。

## カバレッジ

Minimal 戦略のため数値カバレッジは取得しない(unit-test-instructions.md)。要件→テスト対応表(同書)の全行が上記フルスイートに含まれ実行されている。
