# API ドキュメント：amadeus

## 主要 CLI 界面（エンジン）

| コマンド | 役割 |
|---|---|
| `bun .agents/amadeus/tools/amadeus-orchestrate.ts next / report / park` | forwarding loop の中核。directive（run-stage / invoke-swarm / ask / print / error / done / parked）を 1 件ずつ返す。error directive と未捕捉例外は ERROR_LOGGED を自動記録する（#431）。`next` は closed-workflow sentinel（Current Stage: `none`）を done に解決する（#547 随伴） |
| `amadeus-state.ts <verb>` | checkbox / set / gate-start / approve / advance / skip / fork / merge / complete-workflow / unpark / `declare-docs-only --evidence "<DECISION_RECORDED\|GATE_APPROVED> <stage> ..."` など状態機械の書き込み口。`declare-docs-only` は registry へ docsOnly 免除を書き込み、evidence が実在の人間承認 audit イベントを参照しない場合は拒否する（#499）。`complete-workflow` は Current Stage / Next Stage を `none` にし、touched 全件 `[S]` の phase の Phase Progress を `Skipped` へ更新して `PHASE_SKIPPED` を emit する（#547） |
| `amadeus-utility.ts intent-birth / doctor / scope-table / intent / detect [--json] / recompose [--skip ...] [--add ...]` | workflow 誕生、健全性診断（.drops 表面化 = #432、model overlay 乖離の警告 = #554、workspace shell 検査の 2 状態分離 = エンジン dir 不在は installer 再実行誘導で fail / memory 未 seed は固定 marker つき advisory pass で導入直後 exit 0 = #573 を含む）、scope 表生成、workspace 検出（`detect --json` で構造化出力）、running workflow の pending ステージ suffix flip（`recompose`、RECOMPOSED を audit へ記録） |
| `amadeus-graph.ts compile / validate-grid --proposal <path> [--strict] [--project-type <t>]` | stage-graph.json / scope-grid.json の生成（rules 解決は構造的 walk-up = #491）、compose 提案 grid の論理整合検証（`validate-grid`） |
| `/amadeus compose "<task>"` / `/amadeus compose --report <path>` | amadeus-composer-agent をディスパッチしてカスタム EXECUTE/SKIP grid を提案（Adaptive Workflows 2.2.0）。人間承認後に `recompose` で running workflow へ適用 |
| `amadeus-runtime.ts compile` | 対象 Intent の runtime-graph.json 生成（bolt_dag を含む） |
| `amadeus-learnings.ts surface` | §13 candidates の surface。runtime-graph に slug が無い場合は 1 回だけ自動 compile して再解決し、なお不能・compile 失敗時は復旧手順つきエラー（exit 1、無言 fail なし）を出す（#558） |
| `dev-scripts/apply-model-overrides.ts` | model-overrides.json の宣言を engine agents へ適用（--use-fallback で fallback モデルへ切替。#554） |
| `amadeus-learnings.ts persist` | learnings（規則）の永続化。冪等性 key は `cid:<dirName>:<slug>:<candidateId>`（dirName は出所 Intent の record dir 名）。戻り値は `rule_learned`（新規追記）と `already_present`（既存 marker 一致）を分離しており、別 Intent の同名 candidate_id でも marker 衝突による無言 no-op が起きない（#504） |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <ws> [dirName]` | 配布先で実行できる構造検証 |
| `npm run test:all` / `npm run kanban:sync` | 標準検証入口 / board 全件同期 |
| `npm run models:apply` / `npm run models:check` | model overlay の適用 / 宣言一致検査（#554）。apply は管理外実値を非ゼロ拒否し、base 更新は `--accept-upstream-base` の明示操作のみ。上流同期後は parity:check → models:apply の順（AGENTS.md 運用注意） |
| `npm run amadeus:install -- --target <workspace>` / `bun run scripts/amadeus-install.ts --target <workspace>` | エンジンと skill を対象 workspace へ配布インストールする唯一の入口（冪等。#451） |
