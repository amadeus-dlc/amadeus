# アーキテクチャ：amadeus

## 層構成

| 層 | 場所 | 責務 |
|---|---|---|
| エンジン | `.agents/amadeus/tools/`（26 CLI） | 状態機械、stage graph、audit、Bolt / swarm / worktree、scope 解決。routing の正はエンジンで、skill 側 prose では再導出しない |
| hooks | `.agents/amadeus/hooks/`（11 本） | session start/end、stop 督促、presence mint、sensor fire、runtime compile、subagent 記録。fail-open（失敗は .aidlc-hooks-health/*.drops へ記録し、doctor が表面化する = #432） |
| stage 定義 | `.agents/amadeus/amadeus-common/stages/`（5 phase / 32 stage） | frontmatter（produces / consumes / scopes / sensors）と stage 本文。scope membership は frontmatter → `amadeus-graph.ts compile` で scope-grid.json へ転置 |
| method rules | `aidlc/spaces/<space>/memory/`（org / team / project / phases/*） | compile 時に各 stage の rules_in_context へ焼き込む |
| skills | `skills/amadeus*`（source）→ `.agents/skills/`（昇格先） | 単独実行用 stage runner と補助入口。同期は promote-skill.ts のみ |
| 台帳 | `intents/intents.json`（registry、正準）+ 各 record の `aidlc-state.md` / `audit/` | `active-intent` が現在対象を示す。人間向け索引は廃止（GD009）。台帳は生きた台帳で PR 断面と一致しない（docs/amadeus/lifecycle/state.md） |
| 可視化 | `dev-scripts/kanban/` + hooks 結線（#470） | GitHub Projects v2 への一方向鏡（Maintainer 専用の表示鏡） |
