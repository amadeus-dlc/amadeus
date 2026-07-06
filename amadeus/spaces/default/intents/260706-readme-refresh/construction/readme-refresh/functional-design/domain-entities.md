# Domain Entities — readme-refresh

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## README の記載対象と実体の対応（照合台帳）

| 記載対象 | 実体（正） | 実測値（2026-07-06。初回照合 7829d99a、PR #539 / #542 merge 後の 33c40271 で再照合済み） |
|---|---|---|
| 公開入口 | `.claude/skills/amadeus/`、AMADEUS.md | `amadeus` の 1 個（エンジン駆動） |
| 補助入口 | AMADEUS.md「Skills」節 + skill 実在 | `amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-validator` の 3 個 |
| ステージ実行 skill | `.claude/skills/` / `.agents/skills/`（amadeus* prefix 42 skill 一致。PR #539 merge 後の再照合で 41 → 42）、`skills/amadeus/references/stage-catalog.md` | 29 個（`amadeus-<stage>` 形式。32 ステージ − Initialization 3） |
| scope / composer shortcut | 同上 | `amadeus-bugfix`、`amadeus-feature`、`amadeus-mvp`、`amadeus-security-patch` + `amadeus-init` + `amadeus-compose`（PR #539 の上流 2.2.0 取り込みで新設。stage-catalog.md が「the composer shortcut」と記載） |
| 読み取り専用ユーティリティ | 同上 | `amadeus-outcomes-pack`、`amadeus-replay`、`amadeus-session-cost` |
| scope | `.agents/amadeus/scopes/amadeus-<name>.md` | 10 個（bugfix、enterprise、feature、infra、mvp、pdm、poc、refactor、security-patch、workshop） |
| ステージ数・phase | `.agents/amadeus/tools/data/stage-graph.json` | 32 ステージ、5 phase（Initialization / Ideation / Inception / Construction / Operation） |
| 検証 script | package.json の scripts | `test:all`、`validate:workspace`（`validate:all` は不在） |
| インストーラ | `scripts/amadeus-install.ts` の MANIFEST | engineDirs 7 個、claudeSymlinks = 同 7 個、`amadeus:install` script、doctor サブコマンド |
| Intent 台帳 | `aidlc/spaces/<space>/intents/intents.json` | 正準台帳（UUIDv7）。`intents.md` 索引は廃止（GD009） |
| 言語方針 | `docs/amadeus/language-policy.md`（PR #536 で新設） | 英語 `*.md` = 正、`*.ja.md` = 併置 |
| ライフサイクル契約 docs | `docs/amadeus/lifecycle/` | overview / scopes / ideation / inception / construction / state の 6 ファイル |

## 退役済み・実在しない記載（削除対象）

| 現行 README の記載 | 状態 |
|---|---|
| `amadeus-event-storming`、`amadeus-domain-grilling` | skill 不在（補助入口は 3 個） |
| `amadeus-steering` | skill 不在（土台整備はエンジンの space verb / Initialization ステージが担う） |
| `amadeus-ideation-*` 等の `amadeus-<phase>-<stage>` 22 個 | 旧命名（現行は `amadeus-<stage>`） |
| `amadeus-decision-review`、`amadeus-history-review`、`amadeus-learning-review` | skill 不在 |
| `examples/` | ディレクトリ退役済み |
| `npm run validate:all` | script 不在 |
| `intents/intents.md` | 廃止（GD009） |
| skill-forge 規定の team.md 引用 | 定義元不在（normative docs 全体に skill-forge の定義なし） |
