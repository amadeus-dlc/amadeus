# 実現可能性評価 — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[build-vs-buy.md](../market-research/build-vs-buy.md)

## 技術的実現可能性

必要な機構はすべて Bun 標準 API と既存資産で実現できる。新規の外部依存は不要である。

| 要素 | 実現手段 | 実在確認 |
|---|---|---|
| フルセットのコピー（エンジン 7 dir、skills 2 系統、AMADEUS.md） | Bun / node:fs の再帰コピー | コピー元は現行 repo に実在（`.agents/amadeus/` = agents、amadeus-common、hooks、knowledge、scopes、sensors、tools の 7 dir を実測確認） |
| symlink 再作成（7 entry） | node:fs の symlink API（相対 target） | 現行 `.claude/` の 7 symlink（agents → ../.agents/amadeus/agents ほか）を実測確認。再作成対象の一覧はこの実測に一致 |
| settings.json の hooks 冪等マージ | JSON 解析 + hooks 配列の union マージ | 現行 settings.json の hooks 配線 11 entry（UserPromptSubmit / SessionStart / SessionEnd / PostToolUse ×5 / PreCompact / SubagentStop / Stop、すべて `bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-*.ts`）を実測確認 |
| 配置直後の軽量スモーク | 既存 doctor 相当（`amadeus-utility.ts` の doctor）をインストール先で起動 | doctor は現行エンジンに実在 |
| 専用 eval（cold cache + オフライン相当） | 一時ディレクトリへ実インストール → 全 tools + 全 hooks を `bun` で module load 駆動 | 同型の隔離 eval 前例が実在（engine sandbox e2e = `dev-scripts/evals/engine-e2e/check.ts`、pdm-scope eval） |

## 必須 env の調査（残実装判断 3 の一部）

現行 settings.json の `env` はハーネス調整用（BASH_MAX_OUTPUT_LENGTH、MAX_THINKING_TOKENS など 19 キー）であり、エンジンの hooks / tools は環境変数に依存せず動作する（hooks は `$CLAUDE_PROJECT_DIR` 参照のみ。これは Claude Code が実行時に与える変数で、settings.json での定義は不要）。したがってマージ対象は hooks 配線だけでよい。確定は Inception（requirements 以降）で行う。

## 結論

実現可能。未知の技術要素はなく、リスクは並行 Intent によるレイアウト変更への追従（raid-log.md R-1）に集約される。
