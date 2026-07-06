# API ドキュメント：amadeus

## 主要 CLI 界面（エンジン）

| コマンド | 役割 |
|---|---|
| `bun .agents/amadeus/tools/amadeus-orchestrate.ts next / report / park` | forwarding loop の中核。directive（run-stage / invoke-swarm / ask / print / error / done / parked）を 1 件ずつ返す。error directive と未捕捉例外は ERROR_LOGGED を自動記録する（#431） |
| `amadeus-state.ts <verb>` | checkbox / set / gate-start / approve / advance / skip / fork / merge / complete-workflow / unpark / `declare-docs-only --evidence "<DECISION_RECORDED\|GATE_APPROVED> <stage> ..."` など状態機械の書き込み口。`declare-docs-only` は registry へ docsOnly 免除を書き込み、evidence が実在の人間承認 audit イベントを参照しない場合は拒否する（#499） |
| `amadeus-utility.ts intent-birth / doctor / scope-table / intent` | workflow 誕生、健全性診断（.drops 表面化 = #432 を含む）、scope 表生成 |
| `amadeus-graph.ts compile` | stage-graph.json / scope-grid.json の生成（rules 解決は構造的 walk-up = #491） |
| `amadeus-runtime.ts compile` | 対象 Intent の runtime-graph.json 生成（bolt_dag を含む） |
| `amadeus-learnings.ts persist` | learnings（規則）の永続化。冪等性 key は `cid:<dirName>:<slug>:<candidateId>`（dirName は出所 Intent の record dir 名）。戻り値は `rule_learned`（新規追記）と `already_present`（既存 marker 一致）を分離しており、別 Intent の同名 candidate_id でも marker 衝突による無言 no-op が起きない（#504） |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <ws> [dirName]` | 配布先で実行できる構造検証 |
| `npm run test:all` / `npm run kanban:sync` | 標準検証入口 / board 全件同期 |
| `npm run amadeus:install -- --target <workspace>` / `bun run scripts/amadeus-install.ts --target <workspace>` | エンジンと skill を対象 workspace へ配布インストールする唯一の入口（冪等。#451） |
