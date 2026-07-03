# Code Summary：B001 walking skeleton

## 変更ファイル

| 変更 | 内容 | 対応する要求 |
|---|---|---|
| `.claude/tools/`（65 ファイル、新規） | エンジン TS ツール一式（data/ 含む）。上流とバイト一致（diff -r 確認済み） | R001 |
| `.claude/aidlc-common/`（37 ファイル、新規） | conductor、stage 定義 31 個、protocols。無改変 | R001、R005 |
| `.claude/sensors/`（4 ファイル、新規） | sensor 定義。無改変 | R007 |
| `.claude/hooks/`（11 ファイル、新規） | hook スクリプト。無改変 | R001 |
| `.claude/settings.json`（変更） | hooks 11 定義の新設マージと、`Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)` の許可追加。既存キーは全保持。上流の env（Bedrock）、model、statusLine、companyAnnouncements は非取り込み | R001（C001） |
| `.gitignore`（変更） | 機械ローカル項目 4 行（clone-id、sessions、runtime-graph、.aidlc-*） | R001 |
| `skills/amadeus-grilling/references/engine-bridge.md`（新規、英語） | grilling 結線規範（一問ずつ、推奨付き、`[Answer]:` 着地、aidlc-log 監査、エンジン無改変） | R002 |
| `skills/amadeus-intent-capture/`（新規、英語） | 上流 aidlc-intent-capture の適応コピー（改名 + bridge 参照追加。エンジンパスと stage slug は原文のまま） | R003 |
| `.agents/skills/amadeus-intent-capture/`、`.agents/skills/amadeus-grilling/`（昇格） | promote-skill.ts による昇格と `.claude/skills/` symlink | R003 |

## 検証（実行記録は 3.6）

- 読み取り専用 smoke: `aidlc-version.ts`（exit 0）、`aidlc-directive.ts`（全ディレクティブ VALID）、`aidlc-state.ts` / `aidlc-orchestrate.ts` / `aidlc-audit.ts`（引数なしで正常な usage 応答）。
- 未コピーディレクトリ（agents、scopes、knowledge、rules）への強依存エラーなし。追加コピー不要。
- 副作用の実証: settings マージ直後からセッションの Write / Bash が新 hooks を発火させ、監査 shard `audit/<host>-<clone>.md` が自動生成された（hook 配線が機能している証拠。smoke ノイズの shard 1 件は削除して原状回復済み）。
