# Technology Stack

> Reverse Engineering 成果物 — 分析対象: main @ 14c40c9c(現 HEAD 8d73e463)

## 言語・ランタイム

| 項目 | 選定 | 備考 |
|---|---|---|
| 言語 | TypeScript(ESM) | typescript ^6.0.3、`tsc --noEmit` で型検査(tsconfig.json + tsconfig.tests.json) |
| ランタイム / PM | Bun | tools / hooks / scripts / tests すべて bun 直接実行。起動 ~20ms。実行ビット不要規約 |
| フレームワークバージョン | AMADEUS_VERSION = 1.0.0 | `core/tools/amadeus-version.ts` / CHANGELOG / README バッジの三者同期を t68 が強制 |

## 開発依存(devDependencies のみ)

| パッケージ | バージョン | 用途 |
|---|---|---|
| @anthropic-ai/claude-agent-sdk | 0.3.158 | e2e テストのエージェント駆動 |
| node-pty | 1.1.0 | e2e のターミナル駆動 |
| @xterm/headless | ^5.5.0 | e2e のターミナルエミュレーション |
| typescript | ^6.0.3 | 型検査 |
| Biome | 2.4系 | リンター(フォーマッタ無効、Prettier 不使用)。lint 対象は tests/ のみ |

**配布物(`dist/<harness>/`)は外部依存ゼロ** — ユーザー側の前提は bun のみ。

## ツールチェーン・品質基盤

- **ビルド**: `bun scripts/package.ts`(+ `--check` ドリフトガード)、`bun run promote:self`(+ `:check`)
- **テスト**: 自作ランナー `tests/run-tests.sh` / `bun tests/run-tests.ts`。4層(smoke / unit / integration / e2e)。デフォルト・`--ci` = smoke+unit+integration、リリース前 `--release` = 全層
- **検査**: `bun run check` = typecheck + lint
- **ロック**: 監査ログは外部依存なしの mkdir ベースロック(システム temp)
- **クロスプラットフォーム**: macOS / Linux / Windows(PowerShell / Git Bash)で同一動作を規約化

## 対応ハーネス(配布ターゲット)

| ハーネス | dist | 特記 |
|---|---|---|
| Claude Code | `dist/claude/` | セルフインストール元(promote:self)。AskUserQuestion 1:1 レンダリング |
| Codex | `dist/codex/` | 唯一 emit.ts 変換あり。rules → `amadeus-rules` リネーム |
| Kiro | `dist/kiro/` | rules → `steering` リネーム |
| Kiro IDE | `dist/kiro-ide/` | — |
