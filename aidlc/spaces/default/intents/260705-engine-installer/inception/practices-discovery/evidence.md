# Evidence：Engine Installer（260705-engine-installer）

上流入力: [team-practices.md](team-practices.md)、[discovered-rules.md](discovered-rules.md)

| 出典 | 実在確認 |
|---|---|
| `.agents/rules/dev-scripts.md` | 実在（TDD、Bun + TS、一時ディレクトリの片付け規定） |
| `dev-scripts/evals/engine-e2e/check.ts` | 実在（隔離 workspace の決定論的 e2e。sandbox 構築と片付けの実装前例） |
| `dev-scripts/evals/pdm-scope/check.ts` | 実在（PR #489 で追加。最新の eval 前例） |
| `package.json` scripts | 実在（test:all → test:ci:mock → typecheck / lint / contracts / parity / wiring / test:it:all / engine-e2e / diff:check の連鎖を実測） |
| `.claude/` symlink 7 entry、`.agents/amadeus/` 7 dir、settings.json hooks 11 entry | feasibility-assessment.md の実測表 |
| `aidlc/spaces/default/memory/team.md` 多体連携の運用 | 実在（PR #503 で steering 化） |
