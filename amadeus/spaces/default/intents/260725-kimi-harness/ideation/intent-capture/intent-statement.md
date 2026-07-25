# Intent Statement — 260725-kimi-harness

## Problem Statement

amadeus は「one core, many harnesses」構成の AI-DLC フレームワークとして、現在6ハーネス(Claude Code / Codex CLI / Cursor / Kiro CLI / Kiro IDE / OpenCode)をサポートしているが、**Kimi Code CLI には未対応**である。Kimi Code ユーザーは AI-DLC ワークフローを自分のハーネスで実行できず、本チーム自身も Kimi Code を使い始めたにもかかわらず、その上で amadeus を dogfood できていない。

Kimi Code の拡張サーフェス(hooks 16イベント・Claude 型 stdin payload、`.kimi-code/skills/`・`.kimi-code/agents/` のプロジェクト自動検出、AskUserQuestion、Agent/AgentSwarm サブエージェント)は公式ドキュメントで確認済みで、既存ハーネスでは Claude Code に最も近い。移植手順(`docs/harness-engineering/09-porting-to-a-new-harness.md`)も確立しており、追うべき道筋は明確である。

## Target Customer

- **第一の顧客**: Kimi Code CLI を使う amadeus 利用者(公開フレームワークのユーザー)。自分のハーネスで AI-DLC ワークフローを hooks 連携込みのフル機能で実行できるようになる
- **第二の顧客**: 本チーム自身。Kimi Code 上で amadeus を dogfood し、ハーネス移植の知見を実地で検証する最初のユーザーとなる

## Success Metrics

Q1 の回答(ユーザー承認済み)より、以下をすべて満たしたとき完了とする:

1. `bun scripts/package.ts kimi` が `dist/kimi/` を生成し、`bun scripts/package.ts kimi --check` がパスする(byte-parity drift guard 成立)
2. 決定的テストが green(t145 packaging parity による自動カバー、kimi adapter 契約テスト、dist 構造 smoke、setup マージの単体テスト)
3. `bun run promote:self` により本リポジトリへ `.kimi-code/` がセルフインストールされる
4. 実機の kimi セッションで `/skill:amadeus` が起動し、hook が発火し(HUMAN_TURN 等が audit に記録される)、`/skill:amadeus --doctor` がパスする
5. kimi 用 live driver(`kimi -p` 非対話駆動)を新規作成し、`AMADEUS_KIMI_*_LIVE=1` ゲートの journey を1本以上実装してローカルで実走 green

## Initiative Trigger

- 本チームが Kimi Code CLI を使い始めた(本セッション自体が Kimi Code 上で動作しており、`.agents/skills/amadeus/*` が40本以上実際にロードされている実測がある)
- Kimi Code の拡張サーフェスが Claude 互換で移植性が高いことが公式 docs で確認できた
- 未配線環境でのワークフロー動作(advisory モード)を実地観測する絶好の dogfood 機会でもある

## Initial Scope Signal

**amadeus-feature**(明示指定済み)。`amadeus/spaces/default/memory/project.md` § Scope Overrides の既定に従う。18ステージ・Standard depth。

スコープの主な事前裁定(承認済みプランより): ハーネス名 `kimi` / harnessDir `.kimi-code`、emit なし・デフォルト runner-gen、`rulesRename: null`、hook 配線はインストーラ冪等マージ(ユーザー明示承認付き)、レンダリングは claude 型 annex(AskUserQuestion + PostToolUse mint)、swarm は subagent フロア、Kimi plugin 経由の配布は本intentでは不採用(将来候補)。
