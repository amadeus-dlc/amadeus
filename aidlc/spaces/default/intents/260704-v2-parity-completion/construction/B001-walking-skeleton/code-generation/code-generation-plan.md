# Code Generation Plan：B001 walking skeleton

対象 Unit: U001 + U002 + U003 の薄切り（エンジン縦切り）。
コピー元: awslabs/aidlc-workflows `dist/claude/`（基準 commit `fde1e1af`、scratchpad の clone）。

## 変更内容と順序

| # | 変更 | 対象 | 検証方法 |
|---|---|---|---|
| 1 | エンジン一式の無改変コピー | 上流 `.claude/{tools,aidlc-common,sensors,hooks}` → 当リポジトリ `.claude/` 配下（設計判断 1。相対配置を保持） | `bun .claude/tools/aidlc-version.ts` など読み取り専用コマンドが動く |
| 2 | settings の名前空間マージ | 上流 settings.json の hooks 11 個とエンジン実行許可（`Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)`）だけを既存 `.claude/settings.json` へ追加。env、model、statusLine、companyAnnouncements、Bedrock 設定は取り込まない（C001） | 既存キーが失われていないことを diff で確認 |
| 3 | .gitignore へ機械ローカル項目を追加 | `aidlc/.aidlc-clone-id`、`aidlc/.aidlc-sessions/`、`runtime-graph.json`、intents 配下の `.aidlc-*` | git status が汚れない |
| 4 | grilling 結線規範の作成 | `skills/amadeus-grilling/references/engine-bridge.md`（英語）。directive の質問要求を一問ずつの対話へ接続し、`[Answer]:` タグと `aidlc-log.ts decision / answer` へ着地させる規範（設計判断 2。エンジン無改変） | 規範がエンジンの stage-protocol と矛盾しない |
| 5 | amadeus-intent-capture の適応コピー | 上流 `skills/aidlc-intent-capture/` → `skills/amadeus-intent-capture/`（改名 + 結線規範への参照追加。エンジンコマンドのパスは原文のまま） | SKILL.md が英語で、エンジン呼び出しが当リポジトリのパスで成立する |
| 6 | 昇格 | `dev-scripts/promote-skill.ts` で `.agents/skills/amadeus-intent-capture` へ昇格し、`.claude/skills/` の symlink を既存パターンに合わせる | 昇格差分ゼロ |

## 取り込まないもの（除外。parity-map の初期内容）

- 上流 `aidlc/` seed、`.mcp.json`、`CLAUDE.md`（既存実データと開発環境を正とする）
- 上流 settings.json の env（Bedrock）、model、effortLevel、statusLine、permissions の広範 allow、companyAnnouncements
- 上流 `.claude/{agents,knowledge,rules,scopes}`（backlog #1。エンジンが強依存する場合だけ最小追加し、記録する）

## 検証方法（実行は 3.6）

- 読み取り専用のエンジンコマンド smoke（`aidlc-version.ts` など。`intent-birth` や `orchestrate next` のような状態変更コマンドは実行しない）
- `npm run test:all`（既存環境の回帰確認。C001）
- `npm run test:it:promote-skill`
