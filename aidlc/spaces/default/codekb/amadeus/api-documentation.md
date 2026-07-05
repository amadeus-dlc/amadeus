# API ドキュメント：amadeus

## 主要 CLI 界面（エンジン）

| コマンド | 役割 |
|---|---|
| `bun .agents/amadeus/tools/amadeus-orchestrate.ts next / report / park` | forwarding loop の中核。directive（run-stage / invoke-swarm / ask / print / error / done / parked）を 1 件ずつ返す。error directive と未捕捉例外は ERROR_LOGGED を自動記録する（#431） |
| `amadeus-state.ts <verb>` | checkbox / set / gate-start / approve / advance / skip / fork / merge / complete-workflow / unpark など状態機械の書き込み口 |
| `amadeus-utility.ts intent-birth / doctor / scope-table / intent` | workflow 誕生、健全性診断（.drops 表面化 = #432 を含む）、scope 表生成 |
| `amadeus-graph.ts compile` | stage-graph.json / scope-grid.json の生成（rules 解決は構造的 walk-up = #491） |
| `amadeus-runtime.ts compile` | 対象 Intent の runtime-graph.json 生成（bolt_dag を含む） |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <ws> [dirName]` | 配布先で実行できる構造検証 |
| `npm run test:all` / `npm run kanban:sync` | 標準検証入口 / board 全件同期 |
