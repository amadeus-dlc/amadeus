# Feasibility Assessment — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)/ 上流入力: `../intent-capture/intent-statement.md`(Problem Statement・Success Metrics・非目標)。market-research はスコープで SKIP のため competitive-analysis / market-trends / build-vs-buy は不在(expected)。

## 総合判定

**実現可能(高確度)** — 既存の manifest 駆動 open-set seam に載せる追加 harness port であり、新規アーキテクチャを要しない。opencode は Claude Code に近い受け取り単位(agents/commands/skills のディレクトリ+JSON 設定)を持ち port 容易度が最も高い。Cursor は rules(.mdc)+AGENTS.md+MCP が中心で、hooks/audit 相当の seam が弱い点が既知の制約(機能差は隠さず文書化する — intent-statement 非目標に整合)。

## 技術的実現性(実測に基づく)

### 内部前提(リポジトリ実測)

- **open-set seam の実在**: `scripts/package.ts:64-71` `discoverHarnessNames()` が `harness/<n>/manifest.ts` を走査して自動発見(「adding harness #N is one harness/<n>/ dir + manifest row (+ optional emit.ts), with zero edits here」のコメント実在)。core 側の編集ゼロで dist/<name>/ が増える — Issue の期待設計(manifest 駆動)と一致
- **port テンプレートの実在**: 既存4 manifest(claude 85行 / codex 66行 / kiro 87行 / kiro-ide 103行)。codex manifest 実読により、`name` / `harnessDir` / `coreDirs`(rules rename 等の写像)/ `harnessFiles` / `emit`(ハーネス固有 surface の合成)で1ハーネスが完結することを確認
- **codex 前例の転用可能性**: codex は「skills を `<project>/.agents/skills/` に emit、設定は config.toml.example、アダプタ shim 1枚」という変形 port の実績 — opencode/Cursor の変形(後述)も同じ emit 機構で吸収可能

### 外部前提(公式ドキュメント実測、2026-07-16 照会)

- **opencode**([Config](https://opencode.ai/docs/config/)、[Agents](https://opencode.ai/docs/agents/)): プロジェクト設定 `opencode.json`(JSON/JSONC)、`.opencode/agents/`(markdown agent 定義)、`.opencode/commands/`、`.opencode/skills/`、`.opencode/plugins/`(custom tools/hooks/integrations)、AGENTS.md instructions、MCP(`mcp` オプション)。**Amadeus の 11 agent persona(.md)・skills・orchestrator 起動導線を自然に写像できる受け皿が揃っている**。権限は既定全許可で `permission` オプションによる絞り込み
- **Cursor**([Rules](https://cursor.com/docs/context/rules)、[CLI MCP](https://cursor.com/docs/cli/mcp)): `.cursor/rules/*.mdc`(frontmatter: description/globs/alwaysApply、4適用モード)、AGENTS.md(ネスト可・親子合成)、`.cursor/mcp.json`(project→global 優先)、CLI `agent -p "<prompt>"` の headless 実行と `agent mcp` 管理。**rules+AGENTS.md+コマンド起動導線で orchestrator 誘導は可能**。一方、Claude の SessionStart/Stop/PostToolUse hook に相当する決定的 hook seam は本調査時点で未確認 — audit/state sync の実現形が最大の設計論点

## リスク分析(要点 — 詳細は raid-log.md)

1. **Cursor の hook/audit seam 不足(中)**: 決定的フックが無い場合、監査イベントは engine ツール自身の emit に限定される(hook 由来の heartbeat/statusline は非対応と文書化)。intent-statement 非目標「機能差を隠さない」で吸収可能
2. **opencode の権限既定全許可(低)**: settings.json.example 相当(pre-approve 一覧)の意味が変わる — permission 設定例の同梱で対処
3. **外部仕様の変動(低〜中)**: opencode/Cursor とも活発に進化中。RE 段で受け取り単位の版付き再実測を行い、成果物に照会日を残す
4. **既存 harness 回帰(低)**: dist:check / promote:self:check / 4層テストの既存ガードが検出面。受け入れ条件「最小 smoke test または packaging drift check 追加」で新ツリーも同水準に載せる

## スコープ整合

初期到達ライン(intent-statement の Success Metrics): `--doctor` / `--version` / basic workflow start。両ハーネスとも CLI からの bun 実行(engine ツール直叩き)が可能なため、この到達ラインは**ハーネス固有 hook の有無に依存せず達成可能** — walking skeleton として適切な最小 e2e スライス。
