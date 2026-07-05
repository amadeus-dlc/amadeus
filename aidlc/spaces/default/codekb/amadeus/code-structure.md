# コード構造：amadeus

## 主要ディレクトリ

| 場所 | 内容 |
|---|---|
| `.agents/amadeus/tools/` | エンジン CLI 群（orchestrate / state / graph / runtime / audit / bolt / swarm / worktree / jump / utility / learnings / log / sensor 群 / lib ほか） |
| `.agents/amadeus/{hooks,scopes,agents,sensors,knowledge,amadeus-common}/` | hooks 11、scope 定義（1 scope 1 ファイル）、agent persona、sensor 実装、共有 knowledge、stage 定義 |
| `skills/`（41）/ `.agents/skills/`（44） | source skill と昇格先。昇格先には source 外の運用 skill（gh-issue-organizer、japanese-tech-writing、skill-forge）を含む |
| `dev-scripts/` | promote-skill、parity-check、contracts、kanban（sync CLI + hooks）、evals/（25 種の決定論的検証） |
| `lints/` | public-type-file と ts-complexity |
| `amadeus-contracts/` | skill 境界・条件・委譲の契約カタログ |
| `docs/amadeus/` | lifecycle 契約（state / scopes ほか）と設計文書 |
