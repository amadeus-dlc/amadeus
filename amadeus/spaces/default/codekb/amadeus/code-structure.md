# コード構造：amadeus

## 主要ディレクトリ

| 場所 | 内容 |
|---|---|
| `.agents/amadeus/tools/` | エンジン CLI 群（orchestrate / state / graph / runtime / audit / bolt / swarm / worktree / jump / utility / learnings / log / sensor 群 / lib ほか） |
| `.agents/amadeus/{hooks,scopes,agents,sensors,knowledge,amadeus-common}/` | hooks 11、scope 定義（1 scope 1 ファイル）、agent persona、sensor 実装、共有 knowledge、stage 定義 |
| `core/skills/`（42）/ `.agents/skills/`（45） | source skill と昇格先。昇格先には source 外の運用 skill（gh-issue-organizer、japanese-tech-writing、skill-forge）を含む。`core/skills/amadeus-compose/`（Adaptive Workflows 2.2.0 で追加）を含む |
| `dev-scripts/` | promote-skill、parity-check、contracts、kanban（sync CLI + hooks）、evals/（32 種の決定論的検証。rename-leftovers = 旧名（aidlc 系）残存の恒久検出器（#526 で検出反転、データ駆動 allowlist）、linter-sensor = 2 段検出の隔離 workspace 検査 #538、model-overlay = overlay 宣言（data/model-overrides.json + apply-model-overrides.ts）の適用・parity 逆変換の検査 #554 を含む） |
| `scripts/` | 配布用インストーラ `amadeus-install.ts`（`.agents/amadeus/` とその skill を対象 workspace へコピーする唯一の配布手段。#451） |
| `mise.toml` | node = "24" を宣言するランタイムバージョン管理設定 |
| `docs/guide/` | 利用者ガイド（上流同名 path。番号付き章 = #533、契約文書の docs/amadeus と責務分離） |
| `amadeus/spaces/<space>/journal/` | Intent 横断の調整記録（第三の space 成果物。日次ファイル + 契約 README = #557） |
| `harness/codex/` | Codex ハーネス差分層（Phase 1 = 契約 README + provenance。skill 別 agents/openai.yaml の正準は source skills 側、Phase 2 で正準化予定 = #552） |
| `lints/` | public-type-file と ts-complexity |
| `amadeus-contracts/` | skill 境界・条件・委譲の契約カタログ |
| `docs/amadeus/` | lifecycle 契約（state / scopes ほか）と設計文書。言語方針（PR #536）: `*.md` が英語正文、`*.ja.md` が日本語版の併置形式（`extension-guide.md / extension-guide.ja.md` など）。lifecycle/ も #575 で英語正 + `.ja.md` 併置へ移行済み。docs/adr は #525（PR #580）で退役（有効判断は extension-guide / lifecycle/overview へ移設） |
| `docs/guide/` | 利用者ガイド（#533、PR #578 で新設。index + 番号付き章、英語正 + `.ja.md` 併置。lifecycle/overview の節見出しへアンカー参照を持つ） |
